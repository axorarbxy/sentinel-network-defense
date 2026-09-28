# SENTINEL System Architecture & Mathematical Specification

## Problem Statement SIH26153
**Title**: AI-based Network Attack Forecasting from Network Traffic Data  
**Core Objective**: Transition from reactive intrusion detection to proactive state-transition forecasting.

---

## 1. Mathematical Formulation: Network State Transition \(P(S_{t+1} \mid S_t)\)

We represent the state of the monitored network at time window $t$ as a composite matrix $S_t \in \mathbb{R}^{N \times D}$, where $N$ is the number of active host nodes and $D=8$ is the normalized feature dimension per host:

\[
S_t = \begin{bmatrix} 
\text{syn\_ack\_ratio} \\ 
\text{port\_entropy} \\ 
\text{iat\_variance} \\ 
\text{payload\_entropy} \\ 
\text{dns\_query\_length} \\ 
\text{flow\_duration\_ms} \\ 
\text{bytes\_sent} \\ 
\text{bytes\_recv} 
\end{bmatrix}_t
\]

The world model approximates the conditional transition probability distribution:

\[
P(S_{t+1} \mid S_t, S_{t-1}, \dots, S_{t-T}) \approx \text{LSTM}_{\theta}(S_{t-T:t})
\]

---

## 2. Two-Stage Chained Model Architecture

```
[Raw Network Traffic / PCAP]
            │
            ▼
[Scapy / NetFlow Unified Feature Extractor]
            │
            ▼
[Stage 1: XGBoost Multi-Class Stage Classifier] ──► TreeSHAP Attributions (PRESENT)
            │
            ▼ (Concatenated State Vector)
[Stage 2: PyTorch LSTM Sequence Forecaster (T=10)]
            │
            ▼
[Autoregressive Rollout (K=5 Windows / 75s)] ──────► Gradient SHAP Attributions (FORECAST T+k)
            │
            ▼
[FastAPI Native WebSocket (/ws)]
            │
            ▼
[React Canvas Digital Twin Frontend]
```

---

## 3. Autoregressive K-Step Simulation Horizon

Given the history sequence $S_{t-T:t}$, the model executes $K=5$ step autoregressive rollout:

1. Step 1: Predict $\hat{S}_{t+1} = \text{Head}_{\text{feat}}(\text{LSTM}(S_{t-T:t}))$.
2. Step 2: Append $\hat{S}_{t+1}$ to window $S_{t-T+1:t+1}$ and predict $\hat{S}_{t+2}$.
3. Repeat through step $K=5$ (75 seconds lead time).

---

## 4. Held-Out Scenario Evaluation Methodology

To prevent temporal data leakage, models are evaluated strictly on **scenario-level held-out splits** (holding out entire unseen attack scenarios such as `CTU-13-Botnet` or `CIC-IDS-2018-EXFIL` during training), comparing macro F1, precision, recall, and false positive rate against an un-sequenced Scikit-Learn Logistic Regression baseline.
