"""
Flow-Level Feature Extraction Module (NetFlow / IPFIX Stats)
Computes volumetric & temporal flow features:
- iat_variance
- flow_duration_ms
- bytes_sent, bytes_recv
- bidirectional_flow_ratio
"""

from typing import List, Dict

def compute_iat_statistics(timestamps: List[float]) -> Dict[str, float]:
    """Compute inter-arrival time (IAT) statistics (mean, variance, max)."""
    if not timestamps or len(timestamps) < 2:
        return {"iat_mean": 0.0, "iat_variance": 0.0, "iat_max": 0.0}
    
    sorted_ts = sorted(timestamps)
    iats = [sorted_ts[i] - sorted_ts[i-1] for i in range(1, len(sorted_ts))]
    
    mean_iat = sum(iats) / len(iats)
    variance_iat = sum((x - mean_iat) ** 2 for x in iats) / len(iats)
    max_iat = max(iats)
    
    return {
        "iat_mean": round(mean_iat, 6),
        "iat_variance": round(variance_iat, 6),
        "iat_max": round(max_iat, 6),
    }

def compute_bidirectional_ratio(bytes_sent: int, bytes_recv: int) -> float:
    """Compute ratio of outbound to inbound bytes."""
    total = bytes_sent + bytes_recv
    if total == 0:
        return 0.5
    return round(bytes_sent / total, 4)
