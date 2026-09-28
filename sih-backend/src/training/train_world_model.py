"""
Train PyTorch LSTM World Model Script (SIH26153)
"""

import os
import numpy as np
import pandas as pd
from typing import Optional
from ..features.extract import generate_sample_dataset, FEATURE_COLUMNS
from ..models.world_model import LSTMWorldModel

WEIGHTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "weights")

def create_sequences(df: pd.DataFrame, seq_len: int = 10):
    feats = df[FEATURE_COLUMNS].values
    stages = df["target_stage_idx"].values
    
    X_seq, Y_feat, Y_stage = [], [], []
    for i in range(len(df) - seq_len):
        X_seq.append(feats[i : i + seq_len])
        Y_feat.append(feats[i + seq_len])
        Y_stage.append(stages[i + seq_len])
        
    return np.array(X_seq), np.array(Y_feat), np.array(Y_stage)

def train_and_save_world_model(train_df: Optional[pd.DataFrame] = None, seed: int = 42, epochs: int = 15) -> LSTMWorldModel:
    os.makedirs(WEIGHTS_DIR, exist_ok=True)
    out_path = os.path.join(WEIGHTS_DIR, "lstm_world_model.pt")

    print(f"\n--- [SENTINEL Training] Training PyTorch LSTM World Model (Seed: {seed}, Epochs: {epochs}) ---")
    if train_df is None:
        train_df = generate_sample_dataset(1800)

    X_seq, Y_feat, Y_stage = create_sequences(train_df, seq_len=10)

    np.random.seed(seed)
    model = LSTMWorldModel(sequence_length=10)
    model.train_on_sequences(X_seq, Y_feat, Y_stage, epochs=epochs)
    model.save_model(out_path)
    return model

if __name__ == "__main__":
    train_and_save_world_model()
