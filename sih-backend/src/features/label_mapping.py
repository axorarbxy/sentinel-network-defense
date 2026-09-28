"""
Dataset Label Mapping Module (SIH26153)
Maps dataset attack annotations (CIC-IDS-2018 & CTU-13) to MITRE ATT&CK stages:
- benign (0)
- reconnaissance (1)
- initial_access (2)
- lateral_movement (3)
- c2 (4)
- exfiltration (5)
"""

from typing import Dict

MITRE_STAGES = [
    "benign",
    "reconnaissance",
    "initial_access",
    "lateral_movement",
    "c2",
    "exfiltration",
]

STAGE_TO_INDEX: Dict[str, int] = {stage: idx for idx, stage in enumerate(MITRE_STAGES)}
INDEX_TO_STAGE: Dict[int, str] = {idx: stage for idx, stage in enumerate(MITRE_STAGES)}

# Explicit mapping from normalized raw label strings (lowercase, hyphen/space -> underscore) to MITRE stages
LABEL_TO_MITRE_STAGE: Dict[str, str] = {
    # Benign traffic
    "benign": "benign",
    "normal": "benign",
    "background": "benign",

    # Reconnaissance (Port sweeps, vulnerability scanning, peer discovery)
    "portscan": "reconnaissance",
    "network_sweep": "reconnaissance",
    "ping_sweep": "reconnaissance",
    "p2p_peer_discovery": "reconnaissance",

    # Initial Access (Credential stuffing, web brute-force, exploitation, DDoS)
    "ftp_bruteforce": "initial_access",
    "ssh_bruteforce": "initial_access",
    "dos_slowloris": "initial_access",
    "dos_slowhttptest": "initial_access",
    "dos_hulk": "initial_access",
    "ddos_loic_http": "initial_access",
    "udp_flood_ddos": "initial_access",
    "brute_force": "initial_access",
    "sql_injection": "initial_access",

    # Lateral Movement (SMB RPC bruteforce, PsExec, RDP, privilege escalation, Infiltration)
    "infiltration": "lateral_movement",
    "smb_bruteforce": "lateral_movement",
    "psexec_execution": "lateral_movement",
    "rdp_pivot": "lateral_movement",
    "smb_rpc_pivot": "lateral_movement",

    # Command & Control (IRC Botnet, HTTPS beaconing, DNS C2, Bot)
    "bot": "c2",
    "irc_botnet_c2": "c2",
    "ctu13_neris_bot": "c2",
    "ctu13_rbot_c2": "c2",
    "irc_beacon": "c2",
    "dns_beacon": "c2",

    # Exfiltration (DNS tunneling, sustained data exfil, HOIC exfil)
    "dns_tunneling": "exfiltration",
    "data_exfiltration": "exfiltration",
    "data_exfiltration_dns": "exfiltration",
    "ddos_attack_hoic": "exfiltration",
    "ftp_exfil": "exfiltration",
}

def map_label_to_mitre_stage(raw_label: str) -> str:
    """Normalize raw dataset string to standard MITRE stage key."""
    cleaned = str(raw_label).strip().lower().replace(" ", "_").replace("-", "_")
    return LABEL_TO_MITRE_STAGE.get(cleaned, "benign")

def map_label_to_index(raw_label: str) -> int:
    """Map raw dataset label directly to integer index (0-5)."""
    stage = map_label_to_mitre_stage(raw_label)
    return STAGE_TO_INDEX[stage]
