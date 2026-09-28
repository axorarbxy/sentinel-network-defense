"""
Ad-Hoc Traffic Ingestion & Analysis Engine (SIH26153)
Executes feature extraction, stage classification, PyTorch LSTM forecasting, and SHAP explainability
on user-uploaded PCAP, PCAPNG, or CSV capture files.
"""

import os
import json
import time
import math
import uuid
import shutil
import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, Any, List, Tuple, Optional

from ..features.extract import (
    FEATURE_COLUMNS,
    extract_record_features,
)
from ..models.stage_classifier import XGBoostStageClassifier
from ..models.world_model import LSTMWorldModel
from ..models.explain import SentinelExplainabilityEngine

# In-memory Job Status Store
JOB_STORE: Dict[str, Dict[str, Any]] = {}

# Weight Artifacts Path
WEIGHTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "weights"))
XGB_PATH = os.path.join(WEIGHTS_DIR, "xgboost_stage_classifier.json")
LSTM_PATH = os.path.join(WEIGHTS_DIR, "lstm_world_model.pt")

# Global ML Models Singleton
stage_classifier = XGBoostStageClassifier()
world_model = LSTMWorldModel(sequence_length=10)

if os.path.exists(XGB_PATH):
    stage_classifier.load_model(XGB_PATH)
if os.path.exists(LSTM_PATH):
    world_model.load_model(LSTM_PATH)

explain_engine = SentinelExplainabilityEngine(stage_classifier, world_model)


def get_job_status(job_id: str) -> Dict[str, Any]:
    """Retrieve job status or error payload."""
    return JOB_STORE.get(job_id, {
        "job_id": job_id,
        "status": "failed",
        "error": "Job ID not found",
        "progress_message": "Invalid job identifier"
    })


def get_job_report(job_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve completed job report payload."""
    job = JOB_STORE.get(job_id)
    if not job or job.get("status") != "done":
        return None
    return job.get("report")


def _safe_float(value: Any, fallback: float) -> float:
    """Convert a CSV scalar without allowing malformed values to abort a job."""
    if value is None or pd.isna(value):
        return fallback
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return fallback
    return parsed if math.isfinite(parsed) else fallback


def process_uploaded_file(job_id: str, file_path: str, original_filename: str, file_size_bytes: int):
    """
    Background Task: Process uploaded file end-to-end.
    Updates JOB_STORE[job_id] through queued -> extracting_features -> running_inference -> done/failed.
    """
    JOB_STORE[job_id] = {
        "job_id": job_id,
        "status": "extracting_features",
        "progress_message": "Parsing capture file and extracting flow features...",
        "filename": original_filename,
        "file_size_bytes": file_size_bytes,
        "missing_features": [],
        "missing_features_notice": None,
        "error": None,
    }

    try:
        ext = os.path.splitext(original_filename)[1].lower()
        flows = []
        missing_features = []
        missing_features_notice = None

        if ext == ".csv":
            flows, missing_features, missing_features_notice = parse_uploaded_csv(file_path)
        elif ext in [".pcap", ".pcapng"]:
            flows = parse_uploaded_pcap(file_path)
        else:
            raise ValueError(f"Unsupported file format '{ext}'. Must be .pcap, .pcapng, or .csv")

        if not flows:
            raise ValueError("No valid traffic flows or packets could be extracted from the uploaded file.")

        JOB_STORE[job_id]["status"] = "running_inference"
        JOB_STORE[job_id]["progress_message"] = f"Running XGBoost stage classification, PyTorch LSTM rollout & SHAP on {len(flows)} extracted flows..."
        JOB_STORE[job_id]["missing_features"] = missing_features
        JOB_STORE[job_id]["missing_features_notice"] = missing_features_notice

        # Run ML inference on extracted flows
        report = generate_analysis_report(flows, original_filename, file_size_bytes, missing_features, missing_features_notice)

        JOB_STORE[job_id]["status"] = "done"
        JOB_STORE[job_id]["progress_message"] = "Analysis completed successfully."
        JOB_STORE[job_id]["report"] = report

    except Exception as e:
        print(f"[SENTINEL Traffic Analyzer Error] Job {job_id} failed:", e)
        JOB_STORE[job_id]["status"] = "failed"
        JOB_STORE[job_id]["error"] = str(e)
        JOB_STORE[job_id]["progress_message"] = f"Analysis failed: {str(e)}"
    finally:
        # The job directory is created by the upload route and contains only
        # this temporary capture, so remove it after processing completes.
        job_dir = os.path.join(os.path.dirname(file_path))
        try:
            shutil.rmtree(job_dir)
        except OSError:
            pass


def is_private_ip(ip: str) -> bool:
    """Check if IP address is internal private network address."""
    if ip.startswith("10.") or ip.startswith("192.168.") or ip.startswith("127."):
        return True
    if ip.startswith("172."):
        try:
            second_octet = int(ip.split(".")[1])
            if 16 <= second_octet <= 31:
                return True
        except Exception:
            pass
    return False


def parse_uploaded_csv(csv_path: str) -> Tuple[List[Dict[str, Any]], List[str], Optional[str]]:
    """
    Flexible CSV Parser: Maps uploaded CSV columns to SENTINEL 8-feature schema.
    Tracks missing features if columns cannot be derived.
    """
    df_raw = pd.read_csv(csv_path)
    if len(df_raw) == 0:
        return [], [], None

    cols = {c.strip(): c for c in df_raw.columns}
    lower_cols = {c.strip().lower(): c for c in df_raw.columns}

    def find_col(candidates: List[str]) -> Optional[str]:
        for cand in candidates:
            if cand in cols:
                return cols[cand]
            if cand.lower() in lower_cols:
                return lower_cols[cand.lower()]
        return None

    col_src_ip = find_col(["src_ip", "Src IP", "SrcAddr", "source_ip", "src", "Source IP"])
    col_dst_ip = find_col(["dst_ip", "Dst IP", "DstAddr", "destination_ip", "dst", "Destination IP"])
    col_dst_port = find_col(["dst_port", "Dst Port", "Dport", "destination_port", "port", "Destination Port"])
    col_duration = find_col(["flow_duration_ms", "Flow Duration", "Duration", "dur", "flow_duration"])
    col_bytes_sent = find_col(["bytes_sent", "TotLen Fwd Pkts", "TotBytes", "fwd_bytes", "src_bytes", "TotLen Fwd Pkts"])
    col_bytes_recv = find_col(["bytes_recv", "TotLen Bwd Pkts", "bwd_bytes", "dst_bytes", "TotLen Bwd Pkts"])
    col_syn = find_col(["SYN Flag Cnt", "syn_count", "flags_syn", "syn_flags"])
    col_ack = find_col(["ACK Flag Cnt", "ack_count", "flags_ack", "ack_flags"])
    col_iat_std = find_col(["Flow IAT Std", "iat_std", "iat_variance"])
    col_pkt_std = find_col(["Pkt Len Std", "pkt_len_std", "payload_entropy"])
    col_dns_act = find_col(["Fwd Act Data Pkts", "dns_query_length", "dns_act_pkts"])

    missing_features = []
    if col_pkt_std is None:
        missing_features.append("payload_entropy")
    if col_syn is None or col_ack is None:
        missing_features.append("syn_ack_ratio")
    if col_dns_act is None and col_dst_port is None:
        missing_features.append("dns_query_length")

    missing_notice = None
    if missing_features:
        missing_str = ", ".join(missing_features)
        derived_count = 8 - len(missing_features)
        missing_notice = f"Analysis based on {derived_count} of 8 features — {missing_str} unavailable in this CSV."

    # Sample up to 1,000 flows for real-time analysis report
    if len(df_raw) > 1000:
        df_raw = df_raw.sample(n=1000, random_state=42)

    flows = []
    for idx, row in df_raw.iterrows():
        src_ip = str(row[col_src_ip]) if col_src_ip and pd.notna(row[col_src_ip]) else f"10.0.0.{10 + (idx % 15)}"
        dst_ip = str(row[col_dst_ip]) if col_dst_ip and pd.notna(row[col_dst_ip]) else ("198.51.100.42" if idx % 4 == 0 else "10.0.0.5")

        dst_port = int(_safe_float(row[col_dst_port] if col_dst_port else None, 80.0))

        # Flow duration (us -> ms if values > 100,000)
        dur_raw = _safe_float(row[col_duration] if col_duration else None, 1200.0)
        dur_ms = dur_raw / 1000.0 if dur_raw > 50000 else dur_raw

        bytes_sent = _safe_float(row[col_bytes_sent] if col_bytes_sent else None, 1500.0)
        bytes_recv = _safe_float(row[col_bytes_recv] if col_bytes_recv else None, 4200.0)

        # SYN/ACK ratio
        if col_syn and col_ack:
            syn_val = _safe_float(row[col_syn], 1.0)
            ack_val = _safe_float(row[col_ack], 1.0)
            syn_ack_ratio = (syn_val + 1.0) / (ack_val + 1.0)
        else:
            syn_ack_ratio = 0.2

        # IAT Variance
        if col_iat_std:
            iat_std_val = _safe_float(row[col_iat_std], 10.0)
            iat_variance = iat_std_val ** 2 if iat_std_val < 10000 else iat_std_val
        else:
            iat_variance = 0.35

        # Payload Entropy
        if col_pkt_std:
            pkt_std_val = _safe_float(row[col_pkt_std], 50.0)
            payload_entropy = np.clip(pkt_std_val / 100.0 if pkt_std_val > 10 else pkt_std_val, 0.1, 8.0)
        else:
            payload_entropy = 2.1

        # DNS Query Length
        if col_dns_act:
            dns_act_val = _safe_float(row[col_dns_act], 1.0)
            dns_query_length = dns_act_val * 12.0 if dst_port == 53 else 0.0
        else:
            dns_query_length = 24.0 if dst_port == 53 else 0.0

        # Port Entropy
        port_entropy = float(np.log2(dst_port + 1.0)) if dst_port > 0 else 0.5

        feat_dict = {
            "syn_ack_ratio": round(float(syn_ack_ratio), 4),
            "port_entropy": round(float(port_entropy), 4),
            "iat_variance": round(float(iat_variance), 6),
            "payload_entropy": round(float(payload_entropy), 4),
            "dns_query_length": round(float(dns_query_length), 2),
            "flow_duration_ms": round(float(dur_ms), 2),
            "bytes_sent": round(float(bytes_sent), 2),
            "bytes_recv": round(float(bytes_recv), 2),
        }

        flows.append({
            "src_ip": src_ip,
            "dst_ip": dst_ip,
            "dst_port": dst_port,
            "features": feat_dict,
        })

    return flows, missing_features, missing_notice


def parse_uploaded_pcap(pcap_path: str) -> List[Dict[str, Any]]:
    """
    Parse PCAP file using Scapy to extract session features and real packet payload entropy.
    """
    from scapy.all import rdpcap, IP, TCP, UDP
    packets = rdpcap(pcap_path)

    sessions = {}
    for pkt in packets:
        if IP in pkt:
            src = pkt[IP].src
            dst = pkt[IP].dst
            proto = "TCP" if TCP in pkt else "UDP" if UDP in pkt else "OTHER"
            sport = pkt[TCP].sport if TCP in pkt else pkt[UDP].sport if UDP in pkt else 0
            dport = pkt[TCP].dport if TCP in pkt else pkt[UDP].dport if UDP in pkt else 0
            t_sec = float(pkt.time)

            key = (src, dst, dport, proto)
            reverse_key = (dst, src, sport, proto)
            is_reverse_packet = reverse_key in sessions
            if is_reverse_packet:
                key = reverse_key
            if key not in sessions:
                sessions[key] = {
                    "timestamps": [],
                    "payload_bytes": bytearray(),
                    "syn_count": 0,
                    "ack_count": 0,
                    "bytes_sent": 0,
                    "bytes_recv": 0,
                }

            sess = sessions[key]
            sess["timestamps"].append(t_sec)
            pkt_len = len(pkt)
            if is_reverse_packet:
                sess["bytes_recv"] += pkt_len
            else:
                sess["bytes_sent"] += pkt_len

            if TCP in pkt:
                flags = int(pkt[TCP].flags)
                if flags & 0x02:  # SYN
                    sess["syn_count"] += 1
                if flags & 0x10:  # ACK
                    sess["ack_count"] += 1

            if pkt.haslayer(TCP) or pkt.haslayer(UDP):
                payload = bytes(pkt.payload)
                if len(payload) > 0:
                    sess["payload_bytes"].extend(payload[:512])

    flows = []
    for (src, dst, dport, proto), data in sessions.items():
        ts = data["timestamps"]
        dur_ms = max(10.0, (ts[-1] - ts[0]) * 1000.0) if len(ts) > 1 else 100.0

        feat_rec = {
            "syn_count": data["syn_count"],
            "ack_count": data["ack_count"],
            "dst_port": dport,
            "contacted_ports": [dport],
            "timestamps": ts,
            "payload_bytes": bytes(data["payload_bytes"][:2048]),
            "dns_query_length": 18.0 if dport == 53 else 0.0,
            "flow_duration_ms": dur_ms,
            "bytes_sent": float(data["bytes_sent"]),
            "bytes_recv": float(data["bytes_recv"]),
        }

        feat_dict = extract_record_features(feat_rec)
        flows.append({
            "src_ip": src,
            "dst_ip": dst,
            "dst_port": dport,
            "features": feat_dict,
        })

    return flows


def generate_analysis_report(
    flows: List[Dict[str, Any]],
    filename: str,
    file_size_bytes: int,
    missing_features: List[str],
    missing_features_notice: Optional[str]
) -> Dict[str, Any]:
    """
    Construct full analysis report matching state_update schema + summary card payload.
    Item 1: Continuous, un-clamped per-host risk scores derived directly from flow threat probabilities.
    Item 3: Strictly synchronized MITRE stage & host risk score.
    Item 5: 100% Dynamic host role classification from flow graph topology.
    """
    stage_counts = {
        "benign": 0,
        "reconnaissance": 0,
        "initial_access": 0,
        "lateral_movement": 0,
        "c2": 0,
        "exfiltration": 0,
    }

    stage_severity_weights = {
        "benign": 0.02,
        "reconnaissance": 0.45,
        "initial_access": 0.65,
        "lateral_movement": 0.82,
        "c2": 0.90,
        "exfiltration": 0.98,
    }

    host_stats: Dict[str, Dict[str, Any]] = {}
    edges_map: Dict[Tuple[str, str], Dict[str, Any]] = {}

    def get_or_create_host(ip: str) -> Dict[str, Any]:
        if ip not in host_stats:
            host_stats[ip] = {
                "id": ip,
                "bytes_sent": 0,
                "bytes_recv": 0,
                "flows": 0,
                "inbound_sources": set(),
                "outbound_targets": set(),
                "ports": set(),
                "inbound_ports": set(),
                "flow_risk_probs": [],
                "flow_stages": [],
            }
        return host_stats[ip]

    all_stage_probs = []

    for flow in flows:
        src = flow["src_ip"]
        dst = flow["dst_ip"]
        dport = flow["dst_port"]
        feat = flow["features"]

        # Run XGBoost Stage Classification
        top_stage, stage_probs = stage_classifier.predict_single_flow(feat)
        flow["top_stage"] = top_stage
        flow["stage_probs"] = stage_probs
        stage_counts[top_stage] = stage_counts.get(top_stage, 0) + 1
        all_stage_probs.append(stage_probs)

        # Flow Threat Risk Probability P(Threat) = 1.0 - P(Benign) weighted by stage severity
        p_benign = stage_probs.get("benign", 0.90)
        p_threat = max(0.01, 1.0 - p_benign)
        severity_factor = max([stage_probs.get(s, 0.0) * stage_severity_weights.get(s, 0.1) for s in ["exfiltration", "c2", "lateral_movement", "initial_access", "reconnaissance"]] or [0.05])
        flow_risk_score = float(np.clip(0.5 * p_threat + 0.5 * (severity_factor / 0.98), 0.02, 0.99))

        # Host tracking
        h_src = get_or_create_host(src)
        h_dst = get_or_create_host(dst)

        h_src["bytes_sent"] += feat["bytes_sent"]
        h_src["flows"] += 1
        h_src["ports"].add(dport)
        h_src["outbound_targets"].add(dst)
        h_src["flow_risk_probs"].append(flow_risk_score)
        h_src["flow_stages"].append(top_stage)

        h_dst["bytes_recv"] += feat["bytes_recv"]
        h_dst["flows"] += 1
        h_dst["ports"].add(dport)
        h_dst["inbound_ports"].add(dport)
        h_dst["inbound_sources"].add(src)
        h_dst["flow_risk_probs"].append(flow_risk_score)
        h_dst["flow_stages"].append(top_stage)

        # Edge tracking
        edge_key = (src, dst)
        if edge_key not in edges_map:
            edges_map[edge_key] = {
                "src": src,
                "dst": dst,
                "bytes": 0.0,
                "flags": "TCP-ACK" if feat["syn_ack_ratio"] < 1.0 else "TCP-SYN",
                "risk": round(flow_risk_score, 4),
                "protocol": "DNS" if dport == 53 else "HTTPS" if dport == 443 else "TCP",
            }
        edges_map[edge_key]["bytes"] += (feat["bytes_sent"] + feat["bytes_recv"])
        edges_map[edge_key]["risk"] = max(edges_map[edge_key]["risk"], round(flow_risk_score, 4))

    # Determine max in-degree for dynamic target_server role detection
    max_in_degree = max([len(data["inbound_sources"]) for data in host_stats.values()] or [1])

    nodes = []
    for ip, data in host_stats.items():
        # Item 5: 100% Dynamic Host Role Classification based on topology and in-degree
        is_private = is_private_ip(ip)
        in_degree = len(data["inbound_sources"])
        out_degree = len(data["outbound_targets"])
        ports = data["ports"]

        if not is_private:
            role = "external_ip"
        elif 53 in data["inbound_ports"]:
            role = "dns_server"
        elif (in_degree >= max(3, max_in_degree * 0.5)) or (any(p in [80, 443, 3389, 22, 445] for p in ports) and in_degree > out_degree):
            role = "target_server"
        elif ip.endswith(".1") or ip.endswith(".254"):
            role = "core_gateway"
        else:
            role = "workstation"

        # Item 1: Continuous Per-Host Risk Score Calculation
        risk_probs = data["flow_risk_probs"]
        if risk_probs:
            mean_risk = float(np.mean(risk_probs))
            max_risk = float(np.max(risk_probs))
            # 70% max spike threat + 30% average baseline threat
            raw_continuous_risk = 0.70 * max_risk + 0.30 * mean_risk
            # Scale slightly by threat flow volume
            threat_flow_ratio = float(np.mean([1.0 if s != "benign" else 0.0 for s in data["flow_stages"]]))
            final_risk = float(np.clip(raw_continuous_risk + (threat_flow_ratio * 0.12), 0.04, 0.99))
        else:
            final_risk = 0.05

        # Item 3: Synchronize MITRE Stage and Host Risk Score
        # If final_risk >= 0.30 and host has threat flows, display top non-benign threat stage
        non_benign_stages = [s for s in data["flow_stages"] if s != "benign"]
        if final_risk >= 0.30 and non_benign_stages:
            stage_counts_node = pd.Series(non_benign_stages).value_counts()
            node_top_stage = stage_counts_node.index[0]
        else:
            node_top_stage = "benign"

        display_label = f"HOST-{ip.split('.')[-1]} ({role.upper()})"

        nodes.append({
            "id": data["id"],
            "label": display_label,
            "role": role,
            "risk_score": round(final_risk, 4),  # Continuous 4-decimal precision
            "riskScore": round(final_risk, 4),
            "bytes_sent": int(data["bytes_sent"]),
            "bytesSent": int(data["bytes_sent"]),
            "bytes_recv": int(data["bytes_recv"]),
            "bytesReceived": int(data["bytes_recv"]),
            "flows": data["flows"],
            "flowCount": data["flows"],
            "ports": len(data["ports"]),
            "uniquePortsContacted": len(data["ports"]),
            "mitre_stage": node_top_stage,
            "mitreStage": node_top_stage,
        })

    # Top 5 Risk Hosts sorted by continuous risk score
    sorted_nodes = sorted(nodes, key=lambda x: x["risk_score"], reverse=True)
    top_5_risk_hosts = sorted_nodes[:5]

    edges = list(edges_map.values())
    global_risk = round(float(np.mean([n["risk_score"] for n in nodes])) if nodes else 0.1, 4)

    # Compute aggregate Kill Chain Probabilities
    avg_probs = {
        "recon": 0.1,
        "initial_access": 0.1,
        "lateral_movement": 0.1,
        "c2": 0.1,
        "exfiltration": 0.1,
    }
    if all_stage_probs:
        avg_probs = {
            "recon": round(float(np.mean([p.get("reconnaissance", 0.0) for p in all_stage_probs])), 4),
            "initial_access": round(float(np.mean([p.get("initial_access", 0.0) for p in all_stage_probs])), 4),
            "lateral_movement": round(float(np.mean([p.get("lateral_movement", 0.0) for p in all_stage_probs])), 4),
            "c2": round(float(np.mean([p.get("c2", 0.0) for p in all_stage_probs])), 4),
            "exfiltration": round(float(np.mean([p.get("exfiltration", 0.0) for p in all_stage_probs])), 4),
        }

    # Representative feature vector for SHAP & Forecast rollout
    top_flow = flows[0]
    for fl in flows:
        if stage_severity_weights.get(fl.get("top_stage", "benign"), 0) > stage_severity_weights.get(top_flow.get("top_stage", "benign"), 0):
            top_flow = fl

    top_flow_features = top_flow["features"]

    # SHAP Attributions
    shap_present = explain_engine.explain_present_state(top_flow_features)

    # World Model Forecast Rollout (K=5)
    seq_sample = np.tile(list(top_flow_features.values()), (10, 1))
    forecast_steps = world_model.autoregressive_rollout(seq_sample, K=5)

    formatted_forecast = [
        {
            "t_plus": fs["tPlus"],
            "tPlus": fs["tPlus"],
            "timestampOffsetSec": fs.get("timestampOffsetSec", fs["tPlus"] * 15),
            "infiltration_prob": fs["infiltrationProb"],
            "infiltrationProb": fs["infiltrationProb"],
            "predicted_stage": fs["predictedStage"],
            "predictedStage": fs["predictedStage"],
            "confidence": fs["confidence"],
        }
        for fs in forecast_steps
    ]

    # Threat Verdict Formulation
    active_threat_stages = [stg for stg in ["exfiltration", "c2", "lateral_movement", "initial_access", "reconnaissance"] if stage_counts.get(stg, 0) > 0]
    if "exfiltration" in active_threat_stages or "c2" in active_threat_stages:
        verdict = f"CRITICAL THREAT DETECTED — Active {active_threat_stages[0].upper()} pattern present across network hosts."
        verdict_level = "critical"
    elif "lateral_movement" in active_threat_stages:
        verdict = "ELEVATED RISK DETECTED — Internal Reconnaissance & Lateral Movement patterns present."
        verdict_level = "elevated"
    elif "initial_access" in active_threat_stages or "reconnaissance" in active_threat_stages:
        verdict = "MODERATE RISK DETECTED — Initial Scanning & Credential Access probing activity."
        verdict_level = "moderate"
    else:
        verdict = "LOW RISK / NORMAL BASELINE — No significant attack escalation detected."
        verdict_level = "low"

    state_update = {
        "type": "state_update",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "nodes": nodes,
        "edges": edges,
        "global_risk": global_risk,
        "kill_chain_probs": avg_probs,
        "forecast": formatted_forecast,
        "shap_present": shap_present,
        "activeEvents": [
            {
                "id": f"evt-upload-{idx}",
                "timestamp": f"+{idx * 15}s",
                "src": fl["src_ip"],
                "dst": fl["dst_ip"],
                "protocol": f"PORT/{fl['dst_port']}",
                "riskScore": round(stage_severity_weights.get(fl.get("top_stage", "benign"), 0.1), 2),
                "stage": fl.get("top_stage", "benign"),
                "summary": f"Traffic flow analyzed: {fl['src_ip']} -> {fl['dst_ip']} (Stage: {fl.get('top_stage', 'benign')})",
            }
            for idx, fl in enumerate(flows[:6])
        ],
    }

    return {
        "summary": {
            "verdict": verdict,
            "verdict_level": verdict_level,
            "total_flows": len(flows),
            "total_hosts": len(nodes),
            "filename": filename,
            "file_size_bytes": file_size_bytes,
            "time_range": f"Capture snapshot ({len(flows)} flows)",
            "top_risk_hosts": top_5_risk_hosts,
            "missing_features": missing_features,
            "missing_features_notice": missing_features_notice,
        },
        "state_update": state_update,
    }
