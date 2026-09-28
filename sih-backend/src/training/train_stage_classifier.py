"""
Train XGBoost Stage Classifier Script (SIH26153)
"""

import os
import pandas as pd
from typing import Optional
from ..features.extract import generate_sample_dataset, FEATURE_COLUMNS
from ..models.stage_classifier import XGBoostStageClassifier

WEIGHTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "weights")

def train_and_save_stage_classifier(train_df: Optional[pd.DataFrame] = None, seed: int = 42) -> XGBoostStageClassifier:
    os.makedirs(WEIGHTS_DIR, exist_ok=True)
    out_path = os.path.join(WEIGHTS_DIR, "xgboost_stage_classifier.json")

    print(f"\n--- [SENTINEL Training] Training XGBoost Stage Classifier (Seed: {seed}) ---")
    if train_df is None:
        train_df = generate_sample_dataset(1800)

    X = train_df[FEATURE_COLUMNS]
    y = train_df["target_stage_idx"].values

    clf = XGBoostStageClassifier()
    clf.model.random_state = seed
    clf.train(X, y)
    clf.save_model(out_path)
    return clf

if __name__ == "__main__":
    train_and_save_stage_classifier()
