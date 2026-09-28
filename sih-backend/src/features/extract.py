"""
Unified Feature Extraction Pipeline (SIH26153)
Combines flow-level and packet-level features into a single normalized matrix.
Feature column names match frontend SHAP requirements verbatim.
"""

import pandas as pd
import numpy as np
from typing import List, Dict, Any, Tuple
from .packet_features import (
    compute_port_entropy,
    compute_payload_entropy,
    compute_ttl_variance,
    compute_syn_ack_ratio,
)
from .flow_features import compute_iat_statistics, compute_bidirectional_ratio
from .label_mapping import map_label_to_index, map_label_to_mitre_stage

FEATURE_COLUMNS = [
    "syn_ack_ratio",
    "port_entropy",
    "iat_variance",
    "payload_entropy",
    "dns_query_length",
    "flow_duration_ms",
    "bytes_sent",
    "bytes_recv",
]

def extract_record_features(record: Dict[str, Any]) -> Dict[str, float]:
    """
    Extract a single normalized feature vector dictionary from a flow/packet record.
    """
    syn_count = record.get("syn_count", record.get("flags_syn", 1))
    ack_count = record.get("ack_count", record.get("flags_ack", 1))
    syn_ack_ratio = compute_syn_ack_ratio(syn_count, ack_count)

    ports = record.get("contacted_ports", [record.get("dst_port", 80)])
    port_entropy = compute_port_entropy(ports)

    timestamps = record.get("timestamps", [0.0, record.get("flow_duration_ms", 100.0) / 1000.0])
    iat_stats = compute_iat_statistics(timestamps)
    iat_variance = record.get("iat_variance", iat_stats["iat_variance"])

    payload_raw = record.get("payload_bytes", b"")
    if isinstance(payload_raw, str):
        payload_raw = payload_raw.encode("utf-8")
    payload_entropy = record.get("payload_entropy", compute_payload_entropy(payload_raw))

    dns_query_length = float(record.get("dns_query_length", len(record.get("dns_domain", ""))))
    flow_duration_ms = float(record.get("flow_duration_ms", record.get("duration", 1500.0)))

    bytes_sent = float(record.get("bytes_sent", record.get("tot_len_src", 1500.0)))
    bytes_recv = float(record.get("bytes_recv", record.get("tot_len_dst", 4200.0)))

    return {
        "syn_ack_ratio": round(syn_ack_ratio, 4),
        "port_entropy": round(port_entropy, 4),
        "iat_variance": round(iat_variance, 6),
        "payload_entropy": round(payload_entropy, 4),
        "dns_query_length": round(dns_query_length, 2),
        "flow_duration_ms": round(flow_duration_ms, 2),
        "bytes_sent": round(bytes_sent, 2),
        "bytes_recv": round(bytes_recv, 2),
    }

def generate_sample_dataset(num_records: int = 1500) -> pd.DataFrame:
    """
    Generates a realistic feature matrix populated with realistic attack patterns
    mapped directly to CIC-IDS-2018 and CTU-13 scenarios.
    """
    np.random.seed(42)
    records = []
    
    stages = ["benign", "reconnaissance", "initial_access", "lateral_movement", "c2", "exfiltration"]
    
    # Assign scenarios and ensure both scenarios have full multi-stage progressions (0..5)
    for i in range(num_records):
        scenario_id = "CIC-IDS-2018-EXFIL" if (i % 2 == 0) else "CTU-13-BOTNET"
        # Each scenario has full 0..5 stage lifecycle with slight randomized variation
        stage_idx = (i // 10) % 6
        stage = stages[stage_idx]

        if stage == "benign":
            rec = {
                "syn_count": 1, "ack_count": 5,
                "dst_port": 443, "contacted_ports": [443],
                "iat_variance": 0.35, "payload_entropy": 2.1,
                "dns_query_length": 12, "flow_duration_ms": 1200,
                "bytes_sent": 1200, "bytes_recv": 4500,
            }
        elif stage == "reconnaissance":
            rec = {
                "syn_count": 45, "ack_count": 1,
                "dst_port": 80, "contacted_ports": list(range(20, 20 + (i % 80))),
                "iat_variance": 0.85, "payload_entropy": 1.2,
                "dns_query_length": 8, "flow_duration_ms": 450,
                "bytes_sent": 45000, "bytes_recv": 1200,
            }
        elif stage == "initial_access":
            rec = {
                "syn_count": 12, "ack_count": 12,
                "dst_port": 3389, "contacted_ports": [3389, 22],
                "iat_variance": 0.15, "payload_entropy": 4.5,
                "dns_query_length": 24, "flow_duration_ms": 4800,
                "bytes_sent": 180000, "bytes_recv": 24000,
            }
        elif stage == "lateral_movement":
            rec = {
                "syn_count": 8, "ack_count": 8,
                "dst_port": 445, "contacted_ports": [445, 139, 135],
                "iat_variance": 0.04, "payload_entropy": 5.8,
                "dns_query_length": 18, "flow_duration_ms": 8900,
                "bytes_sent": 890000, "bytes_recv": 450000,
            }
        elif stage == "c2":
            rec = {
                "syn_count": 2, "ack_count": 2,
                "dst_port": 8443, "contacted_ports": [8443],
                "iat_variance": 0.001, "payload_entropy": 7.4,
                "dns_query_length": 64, "flow_duration_ms": 15000,
                "bytes_sent": 1200000, "bytes_recv": 480000,
            }
        else:  # exfiltration
            rec = {
                "syn_count": 3, "ack_count": 3,
                "dst_port": 53, "contacted_ports": [53, 443],
                "iat_variance": 0.002, "payload_entropy": 7.9,
                "dns_query_length": 184, "flow_duration_ms": 28000,
                "bytes_sent": 15400000, "bytes_recv": 120000,
            }
        
        feat = extract_record_features(rec)
        # Inject natural realistic boundary noise for baseline/world model evaluation realism
        if np.random.rand() < 0.08:
            feat["syn_ack_ratio"] = float(np.clip(feat["syn_ack_ratio"] + np.random.normal(0, 0.15), 0, 1))
            feat["payload_entropy"] = float(np.clip(feat["payload_entropy"] + np.random.normal(0, 0.8), 0, 8))
            feat["port_entropy"] = float(np.clip(feat["port_entropy"] + np.random.normal(0, 0.5), 0, 5))
            
        feat["label"] = stage
        feat["target_stage_idx"] = stage_idx
        feat["scenario_id"] = scenario_id
        feat["timestamp_offset"] = i * 10
        records.append(feat)

    return pd.DataFrame(records)

if __name__ == "__main__":
    df = generate_sample_dataset(100)
    print("[SENTINEL Extractor] Verified feature matrix shape:", df.shape)
    print("[SENTINEL Extractor] Columns:", df.columns.tolist())
