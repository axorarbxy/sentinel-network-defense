"""
Live Monitor WebSocket Handler (SIH26153)
Broadcasts real-time state_update messages, handles request_node_forecast, and maintains heartbeats.
"""

import asyncio
import json
import time
from typing import List, Set
from fastapi import WebSocket, WebSocketDisconnect
from datetime import datetime
from ..ingestion.traffic_analyzer import stage_classifier, world_model, explain_engine
import numpy as np
from ..features.extract import generate_sample_dataset, FEATURE_COLUMNS

class LiveWebSocketManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.stage_classifier = stage_classifier
        self.world_model = world_model
        self.explain_engine = explain_engine

        # Pre-generate sample simulation data
        self.sample_df = generate_sample_dataset(300)
        self.step_counter = 0

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        print(f"[SENTINEL WS] Client connected. Total active: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        print(f"[SENTINEL WS] Client disconnected. Total active: {len(self.active_connections)}")

    def generate_current_state_update(self, t_offset: int = 0) -> dict:
        """Generate state_update JSON matching frontend schema exactly."""
        self.step_counter += 1
        idx = (self.step_counter + t_offset) % len(self.sample_df)
        row = self.sample_df.iloc[idx].to_dict()
        
        feat_dict = {col: float(row[col]) for col in FEATURE_COLUMNS}
        
        # XGBoost Stage Prediction
        top_stage, stage_probs = self.stage_classifier.predict_single_flow(feat_dict)
        
        # SHAP Attributions
        shap_present = self.explain_engine.explain_present_state(feat_dict)
        
        # World Model Rollout (K=5)
        seq_sample = np.tile(list(feat_dict.values()), (10, 1))
        forecast_steps = self.world_model.autoregressive_rollout(seq_sample, K=5)
        
        nodes = [
            { "id": "10.0.0.1", "label": "GW-ROUTER-01", "role": "core_gateway", "risk_score": 0.12, "bytes_sent": 4850000, "bytes_recv": 5210000, "flows": 840, "ports": 24, "ttl_variance": 0.04, "mitre_stage": "benign" },
            { "id": "10.0.0.2", "label": "DC-DNS-MAIN", "role": "dns_server", "risk_score": 0.28, "bytes_sent": 1920000, "bytes_recv": 1840000, "flows": 620, "ports": 12, "ttl_variance": 0.02, "mitre_stage": "benign" },
            { "id": "10.0.0.10", "label": "DB-PROD-SQL", "role": "target_server", "risk_score": 0.64, "bytes_sent": 3400000, "bytes_recv": 12800000, "flows": 450, "ports": 6, "ttl_variance": 0.18, "mitre_stage": "lateral_movement" },
            { "id": "10.0.0.5", "label": "WS-FINANCE-05", "role": "workstation", "risk_score": 0.88, "bytes_sent": 890000, "bytes_recv": 4200000, "flows": 310, "ports": 142, "ttl_variance": 0.65, "mitre_stage": top_stage },
            { "id": "198.51.100.42", "label": "EXT-SUSPICIOUS-C2", "role": "external_ip", "risk_score": 0.95, "bytes_sent": 15400000, "bytes_recv": 620000, "flows": 520, "ports": 89, "ttl_variance": 0.82, "mitre_stage": "exfiltration" }
        ]
        
        edges = [
            { "id": "10.0.0.5->10.0.0.10", "src": "10.0.0.5", "dst": "10.0.0.10", "bytes": feat_dict["bytes_sent"], "packets": max(1, int(feat_dict["bytes_sent"] / 1200)), "iat_variance": feat_dict["iat_variance"], "flags": "ACK-PSH", "risk": 0.88, "protocol": "TCP" },
            { "id": "10.0.0.5->198.51.100.42", "src": "10.0.0.5", "dst": "198.51.100.42", "bytes": feat_dict["bytes_recv"], "packets": max(1, int(feat_dict["bytes_recv"] / 1200)), "iat_variance": feat_dict["iat_variance"], "flags": "TLS1.3-ENC", "risk": 0.95, "protocol": "HTTPS" }
        ]

        return {
            "type": "state_update",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "nodes": nodes,
            "edges": edges,
            "global_risk": round(float(np.mean([n["risk_score"] for n in nodes])), 2),
            "kill_chain_probs": {
                "recon": round(stage_probs.get("reconnaissance", 0.90), 2),
                "initial_access": round(stage_probs.get("initial_access", 0.60), 2),
                "lateral_movement": round(stage_probs.get("lateral_movement", 0.40), 2),
                "c2": round(stage_probs.get("c2", 0.20), 2),
                "exfiltration": round(stage_probs.get("exfiltration", 0.10), 2),
            },
            "forecast": [
                {
                    "t_plus": fs["tPlus"],
                    "infiltration_prob": fs["infiltrationProb"],
                    "predicted_stage": fs["predictedStage"],
                    "predicted_risk_nodes": [],
                    "confidence": fs["confidence"],
                    "timestamp_offset_sec": fs.get("timestampOffsetSec", fs["tPlus"] * 15)
                }
                for fs in forecast_steps
            ],
            "shap_present": shap_present,
            "activeEvents": [
                {
                    "id": f"evt-{int(time.time())}",
                    "timestamp": datetime.utcnow().strftime("%H:%M:%S"),
                    "src": "10.0.0.5",
                    "dst": "198.51.100.42",
                    "protocol": "HTTPS/TLS1.3",
                    "riskScore": 0.94,
                    "stage": top_stage,
                    "summary": f"High-frequency steady beaconing detected to C2 node (Stage: {top_stage})"
                }
            ]
        }

    async def handle_client_message(self, websocket: WebSocket, raw_text: str):
        """Handle incoming client requests (e.g. request_node_forecast)."""
        try:
            msg = json.loads(raw_text)
            msg_type = msg.get("type")

            if msg_type == "request_node_forecast":
                node_id = msg.get("node_id", "10.0.0.5")
                t_plus = msg.get("t_plus", 3)

                # Compute forecast SHAP
                feat_sample = self.sample_df.iloc[self.step_counter % len(self.sample_df)].to_dict()
                shap_forecast = self.explain_engine.explain_forecast_state(feat_sample, t_plus)

                response = {
                    "type": "node_forecast_response",
                    "node_id": node_id,
                    "t_plus": t_plus,
                    "predicted_stage": "c2" if t_plus >= 3 else "lateral_movement",
                    "risk_score": min(0.99, 0.70 + t_plus * 0.08),
                    "shap_forecast": shap_forecast,
                }
                await websocket.send_text(json.dumps(response))
        except Exception as e:
            print("[SENTINEL WS] Error handling client message:", e)

    async def broadcast_loop(self):
        """Continuous broadcast loop sending state_update and heartbeats."""
        while True:
            await asyncio.sleep(2.5)
            if self.active_connections:
                payload = json.dumps(self.generate_current_state_update())
                heartbeat = json.dumps({"type": "heartbeat", "timestamp": datetime.utcnow().isoformat()})
                
                to_remove = set()
                for ws in self.active_connections:
                    try:
                        await ws.send_text(payload)
                        await ws.send_text(heartbeat)
                    except Exception:
                        to_remove.add(ws)
                
                for ws in to_remove:
                    self.active_connections.discard(ws)

ws_manager = LiveWebSocketManager()
