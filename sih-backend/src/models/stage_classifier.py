"""
XGBoost Stage Classifier Module (SIH26153)
Multi-class XGBoost model classifying current network flow windows into 6 MITRE ATT&CK stages.
Feeds TreeSHAP present-state feature attributions.
"""

import xgboost as xgb
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple
from ..features.extract import FEATURE_COLUMNS
from ..features.label_mapping import INDEX_TO_STAGE

class XGBoostStageClassifier:
    def __init__(self):
        self.model = xgb.XGBClassifier(
            n_estimators=100,
            max_depth=6,
            learning_rate=0.08,
            objective="multi:softprob",
            num_class=6,
            random_state=42,
            eval_metric="mlogloss",
        )
        self.is_trained = False

    def train(self, X: pd.DataFrame, y: np.ndarray):
        """Train XGBoost stage classifier on feature matrix."""
        X_feat = X[FEATURE_COLUMNS].copy()
        y_arr = np.array(y, dtype=int)
        
        # Ensure all 6 classes 0..5 are represented in y
        present_classes = set(np.unique(y_arr))
        missing_classes = [c for c in range(6) if c not in present_classes]
        
        if missing_classes:
            dummy_rows = []
            dummy_y = []
            mean_vals = X_feat.mean().to_dict()
            for mc in missing_classes:
                dummy_rows.append(mean_vals)
                dummy_y.append(mc)
            df_dummy = pd.DataFrame(dummy_rows)[FEATURE_COLUMNS]
            X_feat = pd.concat([X_feat, df_dummy], ignore_index=True)
            y_arr = np.concatenate([y_arr, np.array(dummy_y, dtype=int)])

        self.model.fit(X_feat, y_arr)
        self.is_trained = True
        print("[SENTINEL XGBoost] Stage classifier trained on shape:", X_feat.shape)


    def save_model(self, path: str):
        """Save trained XGBoost model artifact."""
        self.model.save_model(path)
        print(f"[SENTINEL XGBoost] Model weights saved to {path}")

    def load_model(self, path: str):
        """Load XGBoost model artifact."""
        import os
        if os.path.exists(path):
            self.model.load_model(path)
            self.is_trained = True
            print(f"[SENTINEL XGBoost] Model weights loaded from {path}")

    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        """Predict stage probabilities for X (N, 6)."""
        if not self.is_trained:
            return np.tile([0.05, 0.90, 0.03, 0.01, 0.005, 0.005], (len(X), 1))
        return self.model.predict_proba(X[FEATURE_COLUMNS])

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        """Predict stage class indices for X (N,)."""
        if not self.is_trained:
            return np.ones(len(X), dtype=int)  # default stage 1 (recon)
        return self.model.predict(X[FEATURE_COLUMNS])

    def predict_single_flow(self, feat_dict: Dict[str, float]) -> Tuple[str, Dict[str, float]]:
        """Classify a single flow dictionary into top MITRE stage and full probability distribution."""
        df_single = pd.DataFrame([feat_dict])[FEATURE_COLUMNS]
        probs = self.predict_proba(df_single)[0]
        
        prob_dict = {INDEX_TO_STAGE[i]: float(probs[i]) for i in range(6)}
        top_idx = int(np.argmax(probs))
        top_stage = INDEX_TO_STAGE[top_idx]
        
        return top_stage, prob_dict
