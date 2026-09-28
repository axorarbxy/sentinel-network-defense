"""
Label Normalization Row Delta Verifier (SIH26153)
Computes exact row count shifts across all 6 classes before and after hyphen/space normalization fix.
"""

import os
import pandas as pd
from src.features.label_mapping import MITRE_STAGES, LABEL_TO_MITRE_STAGE, STAGE_TO_INDEX

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")

def check_label_mapping_deltas():
    cic_path = os.path.join(DATA_DIR, "cic_ids_2018_sample.csv")
    ctu_path = os.path.join(DATA_DIR, "ctu_13_botnet_sample.csv")

    df_cic = pd.read_csv(cic_path)
    df_ctu = pd.read_csv(ctu_path)
    df = pd.concat([df_cic, df_ctu], ignore_index=True)

    print(f"\n=======================================================")
    print(f"[LABEL MAPPER VERIFICATION] Total Ingested Rows: {len(df)}")
    print(f"=======================================================\n")

    # 1. Old broken mapping function (only replace(" ", "_"))
    def old_map(raw_label):
        cleaned = str(raw_label).strip().lower().replace(" ", "_")
        stg = LABEL_TO_MITRE_STAGE.get(cleaned, "benign")
        return STAGE_TO_INDEX[stg]

    # 2. New fixed mapping function (replace(" ", "_").replace("-", "_"))
    def new_map(raw_label):
        cleaned = str(raw_label).strip().lower().replace(" ", "_").replace("-", "_")
        stg = LABEL_TO_MITRE_STAGE.get(cleaned, "benign")
        return STAGE_TO_INDEX[stg]

    old_idx_counts = df["Label"].apply(old_map).value_counts().to_dict()
    new_idx_counts = df["Label"].apply(new_map).value_counts().to_dict()

    total_misrouted = 0

    print(f"{'Stage Index & Name':<30} | {'Before Fix':<12} | {'After Fix':<12} | {'Row Delta':<12}")
    print("-" * 72)

    for i, stage in enumerate(MITRE_STAGES):
        before = old_idx_counts.get(i, 0)
        after = new_idx_counts.get(i, 0)
        delta = after - before
        if i != 0 and before == 0:
            total_misrouted += after
        print(f"Stage {i}: {stage:<21} | {before:<12} | {after:<12} | {delta:+d} rows")

    print("-" * 72)
    print(f"Total rows misrouted to benign fallback prior to hyphen fix: {total_misrouted} rows")

if __name__ == "__main__":
    check_label_mapping_deltas()
