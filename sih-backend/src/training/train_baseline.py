"""
Train Baseline Logistic Regression Script (SIH26153)
"""

import os
import pandas as pd
from typing import Optional
from ..features.extract import generate_sample_dataset, FEATURE_COLUMNS
from ..models.baseline import BaselineLogisticModel

WEIGHTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "weights")

def train_and_save_baseline(train_df: Optional[pd.DataFrame] = None, seed: int = 42) -> BaselineLogisticModel:
    os.makedirs(WEIGHTS_DIR, exist_ok=True)
    out_path = os.path.join(WEIGHTS_DIR, "baseline_logistic.pkl")

    print(f"\n--- [SENTINEL Training] Training Logistic Regression Baseline (Seed: {seed}) ---")
    if train_df is None:
        train_df = generate_sample_dataset(1800)

    X = train_df[FEATURE_COLUMNS]
    y = train_df["target_stage_idx"].values

    base = BaselineLogisticModel()
    base.model.random_state = seed
    base.train(X, y)
    base.save_model(out_path)
    return base

if __name__ == "__main__":
    train_and_save_baseline()
