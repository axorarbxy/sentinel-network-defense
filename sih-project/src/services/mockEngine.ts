import type { HostNode, FlowEdge, KillChainProbs, ForecastStep, ShapFeature, ThreatEvent, IncidentScenario, StateUpdate, MitreStage } from '../types/sentinel';

// Core fixed infrastructure coordinates (spread across canvas quadrants to prevent overlap)
export const CORE_NODES: HostNode[] = [
  {
    id: '10.0.0.1',
    label: 'GW-ROUTER-01',
    role: 'core_gateway',
    riskScore: 0.12,
    bytesSent: 4850000,
    bytesReceived: 5210000,
    flowCount: 840,
    uniquePortsContacted: 24,
    ttlVariance: 0.04,
    firstSeen: '2026-09-14 00:00:00',
    lastSeen: 'Just now',
    mitreStage: 'benign',
    fx: -220,
    fy: -140,
  },
  {
    id: '10.0.0.2',
    label: 'DC-DNS-MAIN',
    role: 'dns_server',
    riskScore: 0.28,
    bytesSent: 1920000,
    bytesReceived: 1840000,
    flowCount: 620,
    uniquePortsContacted: 12,
    ttlVariance: 0.02,
    firstSeen: '2026-09-14 00:00:00',
    lastSeen: 'Just now',
    mitreStage: 'benign',
    fx: -260,
    fy: 120,
  },
  {
    id: '10.0.0.10',
    label: 'DB-PROD-SQL',
    role: 'target_server',
    riskScore: 0.64,
    bytesSent: 3400000,
    bytesReceived: 12800000,
    flowCount: 450,
    uniquePortsContacted: 6,
    ttlVariance: 0.18,
    firstSeen: '2026-09-14 00:00:00',
    lastSeen: 'Just now',
    mitreStage: 'lateral_movement',
    fx: 220,
    fy: 100,
  },
];

export const PERIPHERAL_NODES: HostNode[] = [
  {
    id: '10.0.0.5',
    label: 'WS-FINANCE-05',
    role: 'workstation',
    riskScore: 0.88,
    bytesSent: 890000,
    bytesReceived: 4200000,
    flowCount: 310,
    uniquePortsContacted: 142,
    ttlVariance: 0.65,
    firstSeen: '2026-09-14 00:15:22',
    lastSeen: 'Just now',
    mitreStage: 'c2',
    x: 0,
    y: 0,
  },
  {
    id: '10.0.0.6',
    label: 'WS-DEV-06',
    role: 'workstation',
    riskScore: 0.35,
    bytesSent: 410000,
    bytesReceived: 980000,
    flowCount: 88,
    uniquePortsContacted: 18,
    ttlVariance: 0.09,
    firstSeen: '2026-09-14 00:05:10',
    lastSeen: 'Just now',
    mitreStage: 'benign',
    x: -120,
    y: -80,
  },
  {
    id: '10.0.0.7',
    label: 'WS-HR-07',
    role: 'workstation',
    riskScore: 0.18,
    bytesSent: 120000,
    bytesReceived: 450000,
    flowCount: 45,
    uniquePortsContacted: 8,
    ttlVariance: 0.03,
    firstSeen: '2026-09-14 00:20:00',
    lastSeen: 'Just now',
    mitreStage: 'benign',
    x: -80,
    y: 180,
  },
  {
    id: '198.51.100.42',
    label: 'EXT-SUSPICIOUS-C2',
    role: 'external_ip',
    riskScore: 0.95,
    bytesSent: 15400000,
    bytesReceived: 620000,
    flowCount: 520,
    uniquePortsContacted: 89,
    ttlVariance: 0.82,
    firstSeen: '2026-09-14 00:32:01',
    lastSeen: 'Just now',
    mitreStage: 'exfiltration',
    x: 260,
    y: -140,
  },
  {
    id: '203.0.113.88',
    label: 'EXT-RECON-SCANNER',
    role: 'external_ip',
    riskScore: 0.74,
    bytesSent: 2800000,
    bytesReceived: 140000,
    flowCount: 290,
    uniquePortsContacted: 240,
    ttlVariance: 0.71,
    firstSeen: '2026-09-14 00:10:44',
    lastSeen: 'Just now',
    mitreStage: 'recon',
    x: 80,
    y: -220,
  },
];

export const SCENARIOS: IncidentScenario[] = [
  {
    id: 'scenario-cic-ids-2018',
    title: 'CIC-IDS-2018: Multi-Stage Exfiltration Attack',
    dataset: 'CIC-IDS-2018',
    attackType: 'APT Stealth Data Exfiltration',
    description: 'Initial stealth port scan followed by credential stuffing on WS-FINANCE-05, SMB lateral movement to DB-PROD-SQL, and DNS tunneling exfiltration to external C2.',
    totalDurationSeconds: 180,
    groundTruthWindows: [
      { timestampOffset: 20, stage: 'recon', targetIp: '10.0.0.5', label: 'SYN Port Sweep (203.0.113.88)', isAttacker: true },
      { timestampOffset: 55, stage: 'initial_access', targetIp: '10.0.0.5', label: 'RDP Credential Stuffing Success', isAttacker: true },
      { timestampOffset: 95, stage: 'lateral_movement', targetIp: '10.0.0.10', label: 'PsExec / SMB RPC Bruteforce', isAttacker: true },
      { timestampOffset: 130, stage: 'c2', targetIp: '198.51.100.42', label: 'Encrypted Beaconing (30s interval)', isAttacker: true },
      { timestampOffset: 165, stage: 'exfiltration', targetIp: '198.51.100.42', label: 'DNS Tunneling Exfiltration (15MB)', isAttacker: true },
    ]
  },
  {
    id: 'scenario-ctu-13-botnet',
    title: 'CTU-13: Fast-Flux Botnet C2 & DDoS Burst',
    dataset: 'CTU-13',
    attackType: 'Neris Botnet & UDP Flood',
    description: 'Internal infected workstation establishing IRC command channel and unleashing synchronized UDP flood against target server.',
    totalDurationSeconds: 150,
    groundTruthWindows: [
      { timestampOffset: 15, stage: 'recon', targetIp: '10.0.0.1', label: 'Peer Discovery Broadcast', isAttacker: true },
      { timestampOffset: 45, stage: 'initial_access', targetIp: '10.0.0.6', label: 'Drive-by Download Execution', isAttacker: true },
      { timestampOffset: 80, stage: 'c2', targetIp: '198.51.100.42', label: 'IRC C2 Master Channel Joined', isAttacker: true },
      { timestampOffset: 120, stage: 'exfiltration', targetIp: '10.0.0.10', label: 'Volumetric UDP Flood Burst', isAttacker: true },
    ]
  }
];

export const MOCK_SHAP_FEATURES: ShapFeature[] = [
  { feature: 'syn_ack_ratio', value: 0.92, contribution: 0.38, description: 'High ratio of unacknowledged SYN packets indicates port scanning or SYN flooding.' },
  { feature: 'port_entropy', value: 3.84, contribution: 0.29, description: 'High entropy across destination ports signals wide host scanning.' },
  { feature: 'iat_variance', value: 0.002, contribution: 0.22, description: 'Extremely rigid inter-arrival time (low variance) typical of automated C2 beacons.' },
  { feature: 'payload_entropy', value: 7.82, contribution: 0.18, description: 'High byte randomness suggests encrypted tunneling or exfiltrated archive data.' },
  { feature: 'flow_duration_ms', value: 14200, contribution: -0.12, description: 'Sustained flow connection slightly reduces immediate flash-flood probability.' },
  { feature: 'dns_query_length', value: 184, contribution: 0.15, description: 'Abnormally long subdomains characteristic of DNS payload encoding.' },
];

export class MockEngine {
  private timeTick = 0;

  public generateStateUpdate(tOffset: number = 0, isForecastMode: boolean = false): StateUpdate {
    this.timeTick += 1;

    // Adjust risk progression based on time offset or tick
    const progressFactor = Math.min(1.0, (this.timeTick % 120) / 100);
    const effectiveOffset = isForecastMode ? tOffset : 0;

    const baseGlobalRisk = Math.min(0.98, 0.25 + progressFactor * 0.55 + effectiveOffset * 0.06);

    // Compute stage probabilities
    const killChainProbs: KillChainProbs = {
      recon: Math.max(0.05, 0.95 - progressFactor * 0.6),
      initial_access: Math.min(0.85, 0.2 + progressFactor * 0.5),
      lateral_movement: Math.min(0.90, Math.max(0.1, (progressFactor - 0.3) * 1.2)),
      c2: Math.min(0.88, Math.max(0.05, (progressFactor - 0.5) * 1.4)),
      exfiltration: Math.min(0.94, Math.max(0.01, (progressFactor - 0.7) * 1.6)),
    };

    // Deep copy nodes and apply dynamic risk scores
    const nodes: HostNode[] = [...CORE_NODES, ...PERIPHERAL_NODES].map((node) => {
      const isTarget = node.id === '10.0.0.5' || node.id === '198.51.100.42';
      const dynamicRisk = isTarget
        ? Math.min(0.99, node.riskScore + progressFactor * 0.15 + effectiveOffset * 0.04)
        : Math.max(0.05, node.riskScore + (Math.random() * 0.04 - 0.02));

      return {
        ...node,
        riskScore: dynamicRisk,
        isGhost: isForecastMode && effectiveOffset > 0,
      };
    });

    // Forecast extra ghost host if deep in forecast
    if (isForecastMode && effectiveOffset >= 3) {
      nodes.push({
        id: '10.0.0.99',
        label: 'PREDICTED-VICTIM-99',
        role: 'workstation',
        riskScore: 0.84,
        bytesSent: 12000,
        bytesReceived: 450000,
        flowCount: 65,
        uniquePortsContacted: 44,
        ttlVariance: 0.45,
        firstSeen: 'Forecast T+' + effectiveOffset,
        lastSeen: 'Forecast T+' + effectiveOffset,
        mitreStage: 'lateral_movement',
        isGhost: true,
        x: 120,
        y: 220,
      });
    }

    // Dynamic Edges
    const edges: FlowEdge[] = [
      {
        id: 'e1',
        src: '203.0.113.88',
        dst: '10.0.0.1',
        bytes: 142000 + Math.floor(Math.random() * 50000),
        packets: 1200,
        protocol: 'TCP',
        flags: 'SYN',
        riskScore: 0.78,
        iatVariance: 0.85,
        shap: MOCK_SHAP_FEATURES.slice(0, 3),
      },
      {
        id: 'e2',
        src: '10.0.0.5',
        dst: '10.0.0.2',
        bytes: 45000,
        packets: 210,
        protocol: 'DNS',
        flags: 'UDP-STD',
        riskScore: 0.32,
        iatVariance: 0.12,
        shap: MOCK_SHAP_FEATURES.slice(3, 5),
      },
      {
        id: 'e3',
        src: '10.0.0.5',
        dst: '10.0.0.10',
        bytes: 890000 + (progressFactor > 0.4 ? 2500000 : 10000),
        packets: 4500,
        protocol: 'TCP',
        flags: 'ACK-PSH',
        riskScore: Math.min(0.96, 0.4 + progressFactor * 0.5),
        iatVariance: 0.01,
        shap: MOCK_SHAP_FEATURES.slice(0, 4),
      },
      {
        id: 'e4',
        src: '10.0.0.5',
        dst: '198.51.100.42',
        bytes: 12400000 * Math.max(0.1, progressFactor),
        packets: 14000,
        protocol: 'HTTPS',
        flags: 'TLS1.3-ENC',
        riskScore: Math.min(0.99, 0.5 + progressFactor * 0.45),
        iatVariance: 0.002,
        shap: MOCK_SHAP_FEATURES.slice(1, 5),
      },
      {
        id: 'e5',
        src: '10.0.0.6',
        dst: '10.0.0.1',
        bytes: 28000,
        packets: 95,
        protocol: 'HTTP',
        flags: 'GET',
        riskScore: 0.14,
        iatVariance: 0.4,
        shap: [],
      },
    ];

    if (isForecastMode && effectiveOffset > 0) {
      edges.forEach(e => { e.isGhost = true; });
      edges.push({
        id: 'e-ghost-1',
        src: '10.0.0.10',
        dst: '198.51.100.42',
        bytes: 45000000,
        packets: 32000,
        protocol: 'TCP',
        flags: 'PREDICTED-EXFIL',
        riskScore: 0.97,
        iatVariance: 0.001,
        isGhost: true,
        shap: MOCK_SHAP_FEATURES.slice(0, 4),
      });
    }

    // Forecast Horizon steps (T+1 to T+5)
    const forecast: ForecastStep[] = Array.from({ length: 5 }, (_, i) => {
      const stepNum = i + 1;
      const stepProb = Math.min(0.99, baseGlobalRisk + stepNum * 0.06);
      const stageOrder: MitreStage[] = ['recon', 'initial_access', 'lateral_movement', 'c2', 'exfiltration'];
      const currentStageIndex = Math.min(4, Math.floor(progressFactor * 4) + Math.floor(stepNum / 2));

      return {
        tPlus: stepNum,
        infiltrationProb: stepProb,
        predictedStage: stageOrder[currentStageIndex],
        predictedRiskNodes: ['10.0.0.5', '10.0.0.10', '198.51.100.42'],
        confidence: Math.max(0.65, 0.96 - stepNum * 0.05),
        timestampOffsetSec: stepNum * 15,
      };
    });

    // Active Threat Ticker Events
    const activeEvents: ThreatEvent[] = [
      {
        id: `evt-${Date.now()}-1`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        src: '10.0.0.5',
        dst: '198.51.100.42',
        protocol: 'HTTPS/TLS1.3',
        riskScore: 0.94,
        stage: 'c2',
        summary: 'High-frequency steady beaconing detected to known C2 node (3000ms IAT)',
      },
      {
        id: `evt-${Date.now()}-2`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, minute: '2-digit', second: '2-digit' }),
        src: '10.0.0.5',
        dst: '10.0.0.10',
        protocol: 'TCP/445 SMB',
        riskScore: 0.88,
        stage: 'lateral_movement',
        summary: 'PsExec admin share write operation detected on DB-PROD-SQL',
      },
      {
        id: `evt-${Date.now()}-3`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, minute: '2-digit', second: '2-digit' }),
        src: '203.0.113.88',
        dst: '10.0.0.1',
        protocol: 'TCP/SYN',
        riskScore: 0.76,
        stage: 'recon',
        summary: 'Distributed SYN port sweep across perimeter gateway',
      },
      {
        id: `evt-${Date.now()}-4`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, minute: '2-digit', second: '2-digit' }),
        src: '10.0.0.2',
        dst: '10.0.0.5',
        protocol: 'DNS/UDP',
        riskScore: 0.35,
        stage: 'initial_access',
        summary: 'TXT record payload query resolution request',
      },
    ];

    return {
      timestamp: new Date().toISOString(),
      nodes,
      edges,
      killChainProbs,
      forecast,
      globalRisk: baseGlobalRisk,
      topShap: MOCK_SHAP_FEATURES,
      activeEvents,
    };
  }
}

export const mockEngineInstance = new MockEngine();
