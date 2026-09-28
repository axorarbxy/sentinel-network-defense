# SENTINEL World-Model Engine Backend (SIH26153)

> **AI-based Network Attack Forecasting from Network Traffic Data**  
> *Real-time Predictive World-Model Cockpit Engine*

---

## Overview

SENTINEL operates as a **predictive network world-model engine**. Unlike reactive intrusion detection systems (IDS) that perform static per-packet classification, SENTINEL models network state dynamics \(P(S_{t+1} \mid S_t, \dots, S_{t-T})\) using a PyTorch LSTM sequence forecaster to autoregressively roll out predictions up to 75 seconds ($K=5$ steps) before exfiltration triggers.

---

## Tech Stack

- **OS Target**: Windows 10/11 & Linux
- **Language**: Python 3.11+
- **Web API**: FastAPI, Uvicorn, Native WebSockets (`websockets`)
- **ML Frameworks**: PyTorch (LSTM sequence forecaster), XGBoost (Stage classifier), Scikit-Learn (Logistic baseline)
- **Explainability**: SHAP (`TreeExplainer` & Gradient SHAP)
- **Packet & Flow Inspection**: Scapy, Pandas, NumPy
- **Dataset Corpus**: Official published CIC-IDS-2018 dataset (22,500 real captured traffic flows across 9 daily capture files / 8 feature dimensions)

- **Persistence**: SQLite via SQLAlchemy ORM

---

## Quick Start & Setup

### 1. Virtual Environment Setup
```bash
# Navigate to sih-backend directory
cd sih-backend

# Create Python virtual environment
python -m venv venv

# Activate virtualenv (Windows PowerShell)
.\venv\Scripts\Activate.ps1

# Install requirements
pip install -r requirements.txt
```

### 2. Run Scenario-Based Held-Out Benchmarks
```bash
python -m src.training.run_benchmarks
```

### 3. Launch FastAPI WebSocket Backend
```bash
python -m src.api.main
# Server starts at http://localhost:8000
# Live WebSocket endpoint at ws://localhost:8000/ws
```

---

## API Endpoints

- `WS /ws` — Real-time Live Monitor WebSocket feed streaming `state_update` JSON payloads.
- `WS /ws/replay` — Historical incident replay WebSocket feed with baseline prediction overlays.
- `GET /api/scenarios` — List available labeled incident scenarios (CIC-IDS-2018 / CTU-13).
- `GET /api/scenarios/{id}/ground_truth` — Get timeline ground-truth attack stage annotations.
- `GET /api/benchmarks` — Get held-out scenario model evaluation report card.

---
