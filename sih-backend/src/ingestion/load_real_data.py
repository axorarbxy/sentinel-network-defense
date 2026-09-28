"""
Real CIC-IDS-2018 Dataset Ingestion & Feature Extraction Engine (SIH26153)
Ingests real multi-GB CIC-IDS-2018 CSV capture files directly from sih-project/data/.
Extracts the 8 pipeline feature dimensions and maps raw label taxonomies to 6 MITRE ATT&CK stages.
"""

import os
import glob
import numpy as np
import pandas as pd
from typing import Tuple, Dict, Any, List
from ..features.label_mapping import INDEX_TO_STAGE

RAW_DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "..", "sih-project", "data"))
if not os.path.exists(RAW_DATA_DIR):
    RAW_DATA_DIR = "r:/sih-project/data"
PROCESSED_DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")

# Real CIC-IDS-2018 Label to 6 MITRE ATT&CK Stage Mapping
REAL_LABEL_TO_STAGE = {
    "benign": 0,                                 # Benign (0)
    "dos attacks-slowloris": 1,                   # Reconnaissance (1)
    "dos attacks-slowhttptest": 1,                # Reconnaissance (1)
    "brute force -web": 1,                       # Reconnaissance (1)
    "brute force -xss": 1,                       # Reconnaissance (1)
    "sql injection": 1,                          # Reconnaissance (1)
    "ftp-bruteforce": 2,                         # Initial Access (2)
    "ssh-bruteforce": 2,                         # Initial Access (2)
    "dos attacks-goldeneye": 2,                  # Initial Access (2)
    "dos attacks-hulk": 2,                       # Initial Access (2)
    "ddos attack-hoic": 2,                       # Initial Access (2)
    "ddos attack-loic-udp": 2,                   # Initial Access (2)
    "infilteration": 3,                          # Lateral Movement (3)
    "bot": 4,                                    # Command & Control (4)
}

def map_real_row_to_stage(label_str: str, dst_port: int, fwd_bytes: float) -> int:
    """Map raw dataset label and flow attributes to 6 MITRE stages."""
    lbl_clean = str(label_str).strip().lower()
    
    # Exfiltration Detection Logic:
    # Outbound data transfers or DNS tunneling during Infiltration / Bot sessions
    if lbl_clean in ["infilteration", "bot"] and (dst_port in [53, 80, 443, 8080, 21, 5353, 8443, 3389]) and fwd_bytes > 1200:
        return 5 # Exfiltration (5)
        
    return REAL_LABEL_TO_STAGE.get(lbl_clean, 0)


def extract_real_cic_features(df_raw: pd.DataFrame, scenario_id: str) -> pd.DataFrame:
    """
    Map raw 80-column CIC-IDS-2018 dataframe into 8-feature normalized matrix.
    """
    df = pd.DataFrame()

    def numeric_column(name: str, default: float) -> pd.Series:
        """Return a numeric, row-aligned column even when an export omits it."""
        if name not in df_raw.columns:
            return pd.Series(default, index=df_raw.index, dtype=float)
        return pd.to_numeric(df_raw[name], errors="coerce").fillna(default)

    # 1. flow_duration_ms (Flow Duration in us -> ms)
    flow_dur_us = numeric_column("Flow Duration", 1000.0)
    df["flow_duration_ms"] = np.clip(flow_dur_us / 1000.0, 0.1, 1e7)
    df["scenario_id"] = scenario_id


    # 2. bytes_sent (TotLen Fwd Pkts)
    df["bytes_sent"] = numeric_column("TotLen Fwd Pkts", 1500.0)

    # 3. bytes_recv (TotLen Bwd Pkts)
    df["bytes_recv"] = numeric_column("TotLen Bwd Pkts", 4200.0)

    # 4. syn_ack_ratio (SYN Flag Cnt / ACK Flag Cnt)
    syn_cnt = numeric_column("SYN Flag Cnt", 1)
    ack_cnt = numeric_column("ACK Flag Cnt", 1)
    df["syn_ack_ratio"] = (syn_cnt + 1.0) / (ack_cnt + 1.0)

    # 5. iat_variance (Flow IAT Std^2)
    iat_std = numeric_column("Flow IAT Std", 10.0)
    df["iat_variance"] = np.clip(iat_std ** 2, 0.0, 1e12)

    # 6. payload_entropy (Methodological Approximation from Packet Length Variance)
    # Note: Flow-level CSVs lack raw payload byte streams; approximated from Pkt Len Std
    pkt_std = numeric_column("Pkt Len Std", 50.0)
    df["payload_entropy"] = np.clip(pkt_std / 100.0, 0.1, 8.0)

    # 7. dns_query_length (Extracted for DNS flows Dst Port == 53)
    dst_ports = numeric_column("Dst Port", 80).astype(int)
    fwd_act_pkts = numeric_column("Fwd Act Data Pkts", 1)
    df["dns_query_length"] = np.where(dst_ports == 53, np.clip(fwd_act_pkts * 12.0, 10.0, 250.0), 0.0)

    # 8. port_entropy (Calculated from destination port distributions)
    port_series = dst_ports.map(lambda p: np.log2(p + 1) if p > 0 else 0.5)
    df["port_entropy"] = np.clip(port_series, 0.1, 16.0)

    # Raw Label & Target Stage Mapping
    raw_labels = df_raw["Label"].astype(str) if "Label" in df_raw.columns else pd.Series("Benign", index=df_raw.index)
    can_derive_exfiltration = "Dst Port" in df_raw.columns and "TotLen Fwd Pkts" in df_raw.columns
    stages = [
        map_real_row_to_stage(lbl, p, b) if can_derive_exfiltration else REAL_LABEL_TO_STAGE.get(lbl.strip().lower(), 0)
        for lbl, p, b in zip(raw_labels, dst_ports, df["bytes_sent"])
    ]
    df["target_stage_idx"] = stages
    df["target_stage"] = [INDEX_TO_STAGE[s] for s in stages]
    df["raw_label"] = raw_labels

    return df

def load_and_preprocess_real_dataset(target_rows_per_file: int = 3500) -> Tuple[pd.DataFrame, List[Dict[str, Any]]]:
    """
    Ingest and process representative flow samples from all 9 real CIC-IDS-2018 daily CSV captures.
    Returns processed dataframe and dataset inventory statistics.
    """
    files = sorted(glob.glob(os.path.join(RAW_DATA_DIR, "*.csv")))
    if not files:
        raise FileNotFoundError(f"No real CSV files found in {RAW_DATA_DIR}")

    processed_dfs = []
    file_stats = []

    print(f"\n[SENTINEL Real Data Engine] Processing {len(files)} real daily capture files...")
    for fp in files:
        fname = os.path.basename(fp)
        sz_bytes = os.path.getsize(fp)
        scenario_id = fname.replace(".csv", "")

        chunks = []
        for chunk in pd.read_csv(fp, chunksize=100000, low_memory=False):
            # Clean header artifacts
            chunk = chunk[chunk["Label"].astype(str).str.strip() != "Label"]
            
            attack_mask = chunk["Label"].astype(str).str.strip().str.lower() != "benign"
            attack_chunk = chunk[attack_mask]
            benign_chunk = chunk[~attack_mask]

            if len(attack_chunk) > 0:
                chunks.append(attack_chunk.sample(min(len(attack_chunk), 1500), random_state=42))
            if len(benign_chunk) > 0 and len(chunks) < 5:
                chunks.append(benign_chunk.sample(min(len(benign_chunk), 1000), random_state=42))
            
            if sum(len(c) for c in chunks) >= target_rows_per_file * 2:
                break

        if chunks:
            df_sampled = pd.concat(chunks, ignore_index=True)
            if len(df_sampled) > target_rows_per_file:
                df_sampled = df_sampled.sample(target_rows_per_file, random_state=42)
        else:
            df_sampled = pd.read_csv(fp, nrows=target_rows_per_file, low_memory=False)

        df_processed = extract_real_cic_features(df_sampled, scenario_id=scenario_id)
        processed_dfs.append(df_processed)

        file_stats.append({
            "filename": fname,
            "size_bytes": sz_bytes,
            "sampled_rows": len(df_processed),
            "attack_rows": int((df_processed["target_stage_idx"] > 0).sum()),
            "benign_rows": int((df_processed["target_stage_idx"] == 0).sum()),
        })
        print(f"  Ingested {fname} ({sz_bytes / (1024*1024):.1f} MB) -> {len(df_processed):,} mapped flows (Attacks: {(df_processed['target_stage_idx'] > 0).sum():,})")

    df_full = pd.concat(processed_dfs, ignore_index=True)
    
    os.makedirs(PROCESSED_DATA_DIR, exist_ok=True)
    csv_out = os.path.join(PROCESSED_DATA_DIR, "real_cic_ids_2018_processed.csv")
    df_full.to_csv(csv_out, index=False)
    print(f"\n[SENTINEL Real Data Engine] Saved processed real dataset to {csv_out} ({len(df_full):,} total rows)")

    return df_full, file_stats
