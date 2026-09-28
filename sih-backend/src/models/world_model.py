"""
PyTorch LSTM World Model Forecaster (SIH26153)
Sequence-to-sequence state transition model learning P(S_t+1 | S_t, ..., S_t-T).
Performs autoregressive K-step rollout (K=5 windows = 75s lead time).
"""

import json
import os
from typing import Dict, List, Tuple, Any

import numpy as np
import torch
import torch.nn as nn
from sklearn.preprocessing import StandardScaler

from ..features.extract import FEATURE_COLUMNS
from ..features.label_mapping import INDEX_TO_STAGE

class LSTMWorldModelNet(nn.Module):
    def __init__(self, input_dim: int = 8, hidden_dim: int = 128, num_classes: int = 6):
        super(LSTMWorldModelNet, self).__init__()
        self.hidden_dim = hidden_dim
        self.lstm = nn.LSTM(input_dim, hidden_dim, num_layers=2, batch_first=True, dropout=0.1)
        
        # Head 1: Predict next state feature vector (8-dim)
        self.feature_head = nn.Sequential(
            nn.Linear(hidden_dim, 64),
            nn.ReLU(),
            nn.Linear(64, input_dim)
        )
        
        # Head 2: Predict next stage probability logits (6-dim)
        self.stage_head = nn.Sequential(
            nn.Linear(hidden_dim, 64),
            nn.ReLU(),
            nn.Linear(64, num_classes)
        )

    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        # x shape: (batch_size, sequence_length T, input_dim)
        lstm_out, _ = self.lstm(x)
        last_step_out = lstm_out[:, -1, :]
        
        pred_features = self.feature_head(last_step_out)
        stage_logits = self.stage_head(last_step_out)
        
        return pred_features, stage_logits

class LSTMWorldModel:
    def __init__(self, sequence_length: int = 10):
        self.sequence_length = sequence_length
        self.input_dim = len(FEATURE_COLUMNS)
        self.net = LSTMWorldModelNet(input_dim=self.input_dim, hidden_dim=128, num_classes=6)
        self.is_trained = False

    def train_on_sequences(self, X_seq: np.ndarray, Y_feat: np.ndarray, Y_stage: np.ndarray, epochs: int = 15):
        """
        Train PyTorch LSTM on sequences of past features.
        X_seq: (N, T, 8), Y_feat: (N, 8), Y_stage: (N,)
        """
        self.net.train()
        optimizer = torch.optim.Adam(self.net.parameters(), lr=0.002)
        mse_loss_fn = nn.MSELoss()
        ce_loss_fn = nn.CrossEntropyLoss()
        
        self.scaler = StandardScaler()
        
        # Scale 3D sequence array X_seq (N, T, 8) and Y_feat (N, 8)
        N, T, D = X_seq.shape
        X_flat = X_seq.reshape(-1, D)
        self.scaler.fit(X_flat)
        
        X_seq_scaled = self.scaler.transform(X_flat).reshape(N, T, D)
        Y_feat_scaled = self.scaler.transform(Y_feat)

        tensor_x = torch.tensor(X_seq_scaled, dtype=torch.float32)
        tensor_yf = torch.tensor(Y_feat_scaled, dtype=torch.float32)
        tensor_ys = torch.tensor(Y_stage, dtype=torch.long)
        
        dataset = torch.utils.data.TensorDataset(tensor_x, tensor_yf, tensor_ys)
        loader = torch.utils.data.DataLoader(dataset, batch_size=32, shuffle=True)
        
        for ep in range(epochs):
            total_loss = 0.0
            for bx, byf, bys in loader:
                optimizer.zero_grad()
                pred_f, pred_s = self.net(bx)
                loss_f = mse_loss_fn(pred_f, byf)
                loss_s = ce_loss_fn(pred_s, bys)
                loss = loss_f + loss_s
                loss.backward()
                optimizer.step()
                total_loss += loss.item()
            if (ep + 1) % 3 == 0 or (ep + 1) == epochs:
                print(f"[SENTINEL World-Model PyTorch] Epoch {ep+1:02d}/{epochs} - Total Loss: {total_loss:.4f}", flush=True)
        
        self.is_trained = True
        print(f"[SENTINEL World-Model] PyTorch LSTM trained for {epochs} epochs. Final Loss: {total_loss:.4f}")

    def _set_scaler(self, mean: Any, scale: Any) -> None:
        """Restore a StandardScaler from JSON-safe statistics."""
        mean_array = np.asarray(mean, dtype=np.float64)
        scale_array = np.asarray(scale, dtype=np.float64)
        if mean_array.shape != (self.input_dim,) or scale_array.shape != (self.input_dim,):
            raise ValueError(f"Expected {self.input_dim} scaler values, got {mean_array.shape} and {scale_array.shape}")
        if not np.all(np.isfinite(mean_array)) or not np.all(np.isfinite(scale_array)) or np.any(scale_array <= 0):
            raise ValueError("Scaler statistics must be finite and have positive scales")

        self.scaler = StandardScaler()
        self.scaler.mean_ = mean_array
        self.scaler.scale_ = scale_array
        self.scaler.var_ = scale_array ** 2
        self.scaler.n_features_in_ = self.input_dim
        self.scaler.n_samples_seen_ = 1

    def save_model(self, path: str):
        """Save model weights and preprocessing statistics for reproducible inference."""
        checkpoint = {
            "state_dict": self.net.state_dict(),
            "scaler_mean": self.scaler.mean_.tolist() if hasattr(self, "scaler") else None,
            "scaler_scale": self.scaler.scale_.tolist() if hasattr(self, "scaler") else None,
        }
        torch.save(checkpoint, path)
        print(f"[SENTINEL World-Model] PyTorch model weights saved to {path}")

    def load_model(self, path: str):
        """Load model weights and scaler metadata, including legacy sidecars."""
        if not os.path.exists(path):
            return

        checkpoint = torch.load(path, weights_only=True)
        if isinstance(checkpoint, dict) and "state_dict" in checkpoint:
            state_dict = checkpoint["state_dict"]
            scaler_mean = checkpoint.get("scaler_mean")
            scaler_scale = checkpoint.get("scaler_scale")
        else:
            # Backward compatibility for legacy state_dict-only artifacts.
            state_dict = checkpoint
            scaler_mean = None
            scaler_scale = None

        self.net.load_state_dict(state_dict)

        sidecar_path = f"{path}.scaler.json"
        if scaler_mean is None or scaler_scale is None:
            try:
                with open(sidecar_path, "r", encoding="utf-8") as sidecar:
                    sidecar_data = json.load(sidecar)
                scaler_mean = sidecar_data.get("mean")
                scaler_scale = sidecar_data.get("scale")
            except FileNotFoundError:
                pass

        if scaler_mean is not None and scaler_scale is not None:
            self._set_scaler(scaler_mean, scaler_scale)
        else:
            print(f"[SENTINEL World-Model] Warning: no scaler metadata found for {path}")

        self.net.eval()
        self.is_trained = True
        print(f"[SENTINEL World-Model] PyTorch model weights loaded from {path}")

    def autoregressive_rollout(self, initial_sequence: np.ndarray, K: int = 5) -> List[Dict[str, Any]]:
        """
        Roll the world model forward K steps autoregressively.
        initial_sequence: shape (T, 8) or (1, T, 8)
        Returns forecast steps: list of { t_plus, infiltration_prob, predicted_stage, confidence, predicted_features }
        """
        self.net.eval()
        sequence_array = np.asarray(initial_sequence, dtype=np.float32)
        if sequence_array.ndim == 2:
            sequence_array = sequence_array[np.newaxis, ...]
        if sequence_array.ndim != 3 or sequence_array.shape[-1] != self.input_dim:
            raise ValueError(f"Expected sequence shape (N, T, {self.input_dim}), got {sequence_array.shape}")

        if hasattr(self, "scaler"):
            shape = sequence_array.shape
            sequence_array = self.scaler.transform(sequence_array.reshape(-1, shape[-1])).reshape(shape)
        current_seq = torch.tensor(sequence_array, dtype=torch.float32)

        forecast_steps = []
        softmax = nn.Softmax(dim=-1)

        with torch.no_grad():
            for step in range(1, K + 1):
                pred_feat, stage_logits = self.net(current_seq)
                probs = softmax(stage_logits)[0].numpy()
                pred_feat_scaled = pred_feat[0].numpy()
                if hasattr(self, "scaler"):
                    pred_feat_np = self.scaler.inverse_transform(pred_feat_scaled.reshape(1, -1))[0]
                else:
                    pred_feat_np = pred_feat_scaled

                top_stage_idx = int(np.argmax(probs))
                predicted_stage = INDEX_TO_STAGE[top_stage_idx]
                
                # Compute infiltration risk score
                raw_prob = float(np.sum(probs[1:])) # sum of malicious stage probs
                confidence = float(np.max(probs))

                step_data = {
                    "tPlus": step,
                    "infiltrationProb": round(min(0.99, max(0.05, raw_prob + step * 0.04)), 2),
                    "predictedStage": predicted_stage,
                    "confidence": round(confidence, 2),
                    "timestampOffsetSec": step * 15,
                    "predictedFeatures": pred_feat_np.tolist(),
                }
                forecast_steps.append(step_data)

                # Feed predicted feature vector back into sequence for true autoregressive rollout
                next_item = pred_feat.unsqueeze(1) # (1, 1, 8)
                current_seq = torch.cat((current_seq[:, 1:, :], next_item), dim=1)

        return forecast_steps
