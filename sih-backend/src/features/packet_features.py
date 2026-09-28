"""
Packet-Level Feature Extraction Module (Scapy / Packet Inspection)
Computes evasion-resistant features:
- port_entropy
- payload_entropy
- ttl_variance
- syn_ack_ratio
"""

import math
from typing import List, Sequence

def compute_shannon_entropy(items: Sequence) -> float:
    """Compute Shannon entropy for sequence of items."""
    if not items:
        return 0.0
    length = len(items)
    counts = {}
    for item in items:
        counts[item] = counts.get(item, 0) + 1
    
    entropy = 0.0
    for count in counts.values():
        p = count / length
        entropy -= p * math.log2(p)
    return round(entropy, 4)

def compute_port_entropy(ports: List[int]) -> float:
    """Compute entropy across destination ports to identify port sweeps."""
    return compute_shannon_entropy(ports)

def compute_payload_entropy(payload_bytes: bytes) -> float:
    """Compute byte entropy for payload to detect DNS tunneling or encrypted archives."""
    if not payload_bytes:
        return 0.0
    return compute_shannon_entropy(list(payload_bytes))

def compute_ttl_variance(ttls: List[int]) -> float:
    """Compute variance in TTL values across packets in session."""
    if not ttls or len(ttls) < 2:
        return 0.0
    mean_ttl = sum(ttls) / len(ttls)
    variance = sum((t - mean_ttl) ** 2 for t in ttls) / len(ttls)
    return round(variance, 4)

def compute_syn_ack_ratio(syn_count: int, ack_count: int) -> float:
    """Compute SYN to ACK ratio to detect SYN floods and port probes."""
    return round(syn_count / (ack_count + 1.0), 4)
