"""
Pydantic API Schemas (SIH26153)
Enforces exact JSON message structure required by the React frontend.
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any

class HostNodeSchema(BaseModel):
    id: str = Field(..., example="10.0.0.5")
    label: Optional[str] = Field(None, example="WS-FINANCE-05")
    role: str = Field(..., example="workstation")
    risk_score: float = Field(..., example=0.89)
    bytes_sent: float = Field(..., example=850000.0)
    bytes_recv: float = Field(..., example=4010000.0)
    flows: int = Field(..., example=310)
    ports: int = Field(..., example=142)
    mitre_stage: str = Field(..., example="c2")
    is_ghost: Optional[bool] = False

class FlowEdgeSchema(BaseModel):
    src: str = Field(..., example="10.0.0.5")
    dst: str = Field(..., example="10.0.0.10")
    bytes: float = Field(..., example=4021000.0)
    flags: str = Field(..., example="SYN,ACK")
    risk: float = Field(..., example=0.71)
    protocol: str = Field(..., example="TCP")
    is_ghost: Optional[bool] = False

class KillChainProbsSchema(BaseModel):
    recon: float = Field(..., example=0.93)
    initial_access: float = Field(..., example=0.22)
    lateral_movement: float = Field(..., example=0.10)
    c2: float = Field(..., example=0.05)
    exfiltration: float = Field(..., example=0.01)

class ForecastStepSchema(BaseModel):
    t_plus: int = Field(..., example=1)
    infiltration_prob: float = Field(..., example=0.55)
    predicted_stage: str = Field(..., example="recon")
    confidence: float = Field(..., example=0.81)

class ShapFeatureSchema(BaseModel):
    feature: str = Field(..., example="syn_ack_ratio")
    value: float = Field(..., example=0.38)
    contribution: Optional[float] = Field(0.0)
    description: Optional[str] = Field("")

class ActiveThreatEventSchema(BaseModel):
    id: str
    timestamp: str
    src: str
    dst: str
    protocol: str
    riskScore: float
    stage: str
    summary: str

class StateUpdateMessage(BaseModel):
    type: str = Field("state_update")
    timestamp: str
    nodes: List[HostNodeSchema]
    edges: List[FlowEdgeSchema]
    global_risk: float
    kill_chain_probs: KillChainProbsSchema
    forecast: List[ForecastStepSchema]
    shap_present: List[ShapFeatureSchema]
    activeEvents: Optional[List[ActiveThreatEventSchema]] = Field(default_factory=list)

class NodeForecastRequest(BaseModel):
    type: str = Field("request_node_forecast")
    node_id: str
    t_plus: int

class NodeForecastResponse(BaseModel):
    type: str = Field("node_forecast_response")
    node_id: str
    t_plus: int
    predicted_stage: str
    risk_score: float
    shap_forecast: List[ShapFeatureSchema]

class ScenarioInfoSchema(BaseModel):
    id: str
    title: str
    dataset: str
    attackType: str
    description: str
    totalDurationSeconds: int

class BenchmarkReportSchema(BaseModel):
    training_corpus: str
    architecture: str
    forecast_horizon: str
    shap_kernel_latency_ms: float
    macro_f1: float
    fpr: float
    mean_forecast_lead_time_seconds: float
    per_stage: List[Dict[str, Any]]
    world_model_confusion: List[List[int]]
    baseline_confusion: List[List[int]]
