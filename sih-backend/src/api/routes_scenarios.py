"""
Scenarios REST API Routes (SIH26153)
GET /api/scenarios - Returns incident scenarios list.
GET /api/scenarios/{id}/ground_truth - Returns attack stage ground-truth timelines.
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from .auth import verify_token

router = APIRouter(prefix="/api/scenarios", tags=["scenarios"], dependencies=[Depends(verify_token)])


SCENARIOS_DATA = [
    {
        "id": "scenario-cic-ids-2018",
        "title": "CIC-IDS-2018: Multi-Stage Exfiltration Attack",
        "dataset": "CIC-IDS-2018",
        "attackType": "APT Stealth Data Exfiltration",
        "description": "Initial stealth port scan followed by credential stuffing on WS-FINANCE-05, SMB lateral movement to DB-PROD-SQL, and DNS tunneling exfiltration to external C2.",
        "totalDurationSeconds": 180,
        "groundTruthWindows": [
            { "timestampOffset": 20, "stage": "recon", "targetIp": "10.0.0.5", "label": "SYN Port Sweep (203.0.113.88)", "isAttacker": True },
            { "timestampOffset": 55, "stage": "initial_access", "targetIp": "10.0.0.5", "label": "RDP Credential Stuffing Success", "isAttacker": True },
            { "timestampOffset": 95, "stage": "lateral_movement", "targetIp": "10.0.0.10", "label": "PsExec / SMB RPC Bruteforce", "isAttacker": True },
            { "timestampOffset": 130, "stage": "c2", "targetIp": "198.51.100.42", "label": "Encrypted Beaconing (30s interval)", "isAttacker": True },
            { "timestampOffset": 165, "stage": "exfiltration", "targetIp": "198.51.100.42", "label": "DNS Tunneling Exfiltration (15MB)", "isAttacker": True },
        ]
    },
    {
        "id": "scenario-ctu-13-botnet",
        "title": "CTU-13: Fast-Flux Botnet C2 & DDoS Burst",
        "dataset": "CTU-13",
        "attackType": "Neris Botnet & UDP Flood",
        "description": "Internal infected workstation establishing IRC command channel and unleashing synchronized UDP flood against target server.",
        "totalDurationSeconds": 150,
        "groundTruthWindows": [
            { "timestampOffset": 15, "stage": "recon", "targetIp": "10.0.0.1", "label": "Peer Discovery Broadcast", "isAttacker": True },
            { "timestampOffset": 45, "stage": "initial_access", "targetIp": "10.0.0.6", "label": "Drive-by Download Execution", "isAttacker": True },
            { "timestampOffset": 80, "stage": "c2", "targetIp": "198.51.100.42", "label": "IRC C2 Master Channel Joined", "isAttacker": True },
            { "timestampOffset": 120, "stage": "exfiltration", "targetIp": "10.0.0.10", "label": "Volumetric UDP Flood Burst", "isAttacker": True },
        ]
    }
]

@router.get("", response_model=List[Dict[str, Any]])
def list_scenarios():
    """List available labeled incident scenarios."""
    return SCENARIOS_DATA

@router.get("/{scenario_id}/ground_truth", response_model=List[Dict[str, Any]])
def get_scenario_ground_truth(scenario_id: str):
    """Get attack timeline ground-truth flags for timeline scrubber."""
    for sc in SCENARIOS_DATA:
        if sc["id"] == scenario_id:
            return sc["groundTruthWindows"]
    raise HTTPException(status_code=404, detail="Scenario not found")
