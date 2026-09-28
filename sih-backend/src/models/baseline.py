"""
Logistic Regression Baseline Model (SIH26153)
Classical non-sequence classifier baseline trained on identical normalized features.
Provides empirical comparison metrics (F1, Precision, Recall, FPR).
"""

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from typing import Dict, Any, Tuple
from ..features.extract import FEATURE_COLUMNS

class BaselineLogisticModel:
    def __init__(self):
        self.scaler = StandardScaler()
        self.model = LogisticRegression(max_iter=1000, solver="lbfgs", random_state=42)
        self.is_trained = False

    def train(self, X: pd.DataFrame, y: np.ndarray):
        """Train logistic regression baseline model."""
        X_scaled = self.scaler.fit_transform(X[FEATURE_COLUMNS])
        self.model.fit(X_scaled, y)
        self.is_trained = True
        print("[SENTINEL Baseline] Logistic Regression trained on shape:", X_scaled.shape)

    def save_model(self, path: str):
        """Save baseline model pickle."""
        import pickle
        with open(path, "wb") as f:
            pickle.dump({"scaler": self.scaler, "model": self.model}, f)
        print(f"[SENTINEL Baseline] Model saved to {path}")

    def load_model(self, path: str):
        """Load baseline model pickle."""
        import os, pickle
        if os.path.exists(path):
            with open(path, "rb") as f:
                data = pickle.load(f)
                self.scaler = data["scaler"]
                self.model = data["model"]
                self.is_trained = True
            print(f"[SENTINEL Baseline] Model loaded from {path}")

    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        """Predict stage probabilities (N, 6)."""
        if not self.is_trained:
            # Fallback uniform probability if untrained
            num_samples = len(X)
            return np.full((num_samples, 6), 1.0 / 6.0)
        X_scaled = self.scaler.transform(X[FEATURE_COLUMNS])
        return self.model.predict_proba(X_scaled)

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        """Predict stage class index (N,)."""
        if not self.is_trained:
            return np.zeros(len(X), dtype=int)
        X_scaled = self.scaler.transform(X[FEATURE_COLUMNS])
        return self.model.predict(X_scaled)
