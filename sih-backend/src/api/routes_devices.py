from datetime import datetime, timezone
from typing import Literal, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from .auth import verify_token

router = APIRouter(prefix="/api/devices", tags=["devices"], dependencies=[Depends(verify_token)])

class DeviceActionResponse(BaseModel):
    device_id: str
    status: str
    message: str
    control_mode: Optional[str] = None
    risk_score: Optional[float] = None
    threshold: Optional[float] = None
    request_id: Optional[str] = None

class RiskActionRequest(BaseModel):
    risk_score: float = Field(..., ge=0, le=1)

class ApprovalRequest(BaseModel):
    decision: Literal["approve", "deny"]

DEVICE_STATUS = {
    "10.0.0.5": True,
    "10.0.0.6": True,
    "10.0.0.7": True,
    "10.0.0.10": True,
    "198.51.100.42": True,
    "203.0.113.88": True,
}

# Prototype policy state is intentionally in memory; replace with durable audit storage later.
LOW_THREAT_THRESHOLD = 0.30
DISCONNECT_REQUESTS = {}

def _status_response(device_id: str, message: str, **extra):
    is_connected = DEVICE_STATUS[device_id]
    return {
        "device_id": device_id,
        "status": "connected" if is_connected else "disconnected",
        "message": message,
        **extra,
    }

@router.post("/{device_id}/disconnect", response_model=DeviceActionResponse)
def disconnect_device(device_id: str):
    raise HTTPException(
        status_code=409,
        detail="Direct disconnect is disabled. Use auto-disconnect or request administrator approval.",
    )

@router.post("/{device_id}/auto-disconnect", response_model=DeviceActionResponse)
def auto_disconnect_device(device_id: str, action: RiskActionRequest):
    """Apply the low-threat automation policy without administrator approval."""
    if device_id not in DEVICE_STATUS:
        raise HTTPException(status_code=404, detail="Device not found")
    if action.risk_score > LOW_THREAT_THRESHOLD:
        return _status_response(
            device_id,
            "Automatic action skipped: risk is above the low-threat threshold.",
            control_mode="automatic_low_threat",
            risk_score=action.risk_score,
            threshold=LOW_THREAT_THRESHOLD,
        )
    DEVICE_STATUS[device_id] = False
    return _status_response(
        device_id,
        "Device automatically disconnected under the low-threat policy.",
        control_mode="automatic_low_threat",
        risk_score=action.risk_score,
        threshold=LOW_THREAT_THRESHOLD,
    )

@router.post("/{device_id}/disconnect-request", response_model=DeviceActionResponse)
def request_disconnect(device_id: str, action: RiskActionRequest):
    """Create an approval request; this endpoint never disconnects the device."""
    if device_id not in DEVICE_STATUS:
        raise HTTPException(status_code=404, detail="Device not found")
    request_id = str(uuid4())
    DISCONNECT_REQUESTS[request_id] = {
        "device_id": device_id,
        "risk_score": action.risk_score,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    return _status_response(
        device_id,
        "Disconnect request is pending administrator approval.",
        control_mode="administrator_approval",
        risk_score=action.risk_score,
        request_id=request_id,
    )

@router.post("/requests/{request_id}", response_model=DeviceActionResponse)
def decide_disconnect_request(request_id: str, decision: ApprovalRequest):
    request = DISCONNECT_REQUESTS.get(request_id)
    if request is None:
        raise HTTPException(status_code=404, detail="Disconnect request not found")
    if request["status"] != "pending":
        raise HTTPException(status_code=409, detail="Disconnect request was already decided")

    request["status"] = decision.decision + "d"
    device_id = request["device_id"]
    if decision.decision == "approve":
        DEVICE_STATUS[device_id] = False
        message = "Administrator approved the disconnect request."
    else:
        message = "Administrator denied the disconnect request."
    return _status_response(
        device_id,
        message,
        control_mode="administrator_approval",
        risk_score=request["risk_score"],
        request_id=request_id,
    )

@router.post("/{device_id}/restore", response_model=DeviceActionResponse)
def restore_device(device_id: str):
    if device_id not in DEVICE_STATUS:
        raise HTTPException(status_code=404, detail="Device not found")
    DEVICE_STATUS[device_id] = True
    return {
        "device_id": device_id,
        "status": "connected",
        "message": "Device connection restored in prototype mode.",
    }

@router.get("/{device_id}", response_model=DeviceActionResponse)
def get_device_status(device_id: str):
    if device_id not in DEVICE_STATUS:
        raise HTTPException(status_code=404, detail="Device not found")
    is_connected = DEVICE_STATUS[device_id]
    pending_request = next(
        (request_id for request_id, request in DISCONNECT_REQUESTS.items()
         if request["device_id"] == device_id and request["status"] == "pending"),
        None,
    )
    return _status_response(
        device_id,
        "Prototype device state retrieved.",
        control_mode="administrator_approval" if pending_request else None,
        request_id=pending_request,
    )
