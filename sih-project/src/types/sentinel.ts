export type MitreStage = 'recon' | 'initial_access' | 'lateral_movement' | 'c2' | 'exfiltration' | 'benign';

export type NodeRole = 'core_gateway' | 'dns_server' | 'domain_controller' | 'workstation' | 'external_ip' | 'target_server';

export interface ShapFeature {
  feature: string;
  value: number;
  contribution: number; // Signed contribution: >0 pushes malicious (red), <0 pushes benign (blue)
  description: string;
}

export interface HostNode {
  id: string; // IP Address
  label?: string;
  role: NodeRole;
  riskScore: number; // 0.0 to 1.0
  bytesSent: number;
  bytesReceived: number;
  flowCount: number;
  uniquePortsContacted: number;
  ttlVariance: number;
  firstSeen: string;
  lastSeen: string;
  isConnected?: boolean;
  mitreStage: MitreStage;
  isGhost?: boolean;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
}

export interface FlowEdge {
  id: string;
  src: string;
  dst: string;
  bytes: number;
  packets: number;
  protocol: 'TCP' | 'UDP' | 'ICMP' | 'DNS' | 'HTTP' | 'HTTPS';
  flags: string;
  riskScore: number;
  iatVariance: number;
  isGhost?: boolean;
  shap?: ShapFeature[];
}

export interface KillChainProbs {
  recon: number;
  initial_access: number;
  lateral_movement: number;
  c2: number;
  exfiltration: number;
}

export interface ForecastStep {
  tPlus: number; // 1..K
  infiltrationProb: number;
  predictedStage: MitreStage;
  predictedRiskNodes: string[];
  confidence: number;
  timestampOffsetSec: number;
}

export interface ThreatEvent {
  id: string;
  timestamp: string;
  src: string;
  dst: string;
  protocol: string;
  riskScore: number;
  stage: MitreStage;
  summary: string;
}

export interface GroundTruthWindow {
  timestampOffset: number; // seconds from start
  stage: MitreStage;
  targetIp: string;
  label: string;
  isAttacker: boolean;
}

export interface IncidentScenario {
  id: string;
  title: string;
  dataset: 'CIC-IDS-2018' | 'CTU-13' | 'Custom PCAP';
  attackType: string;
  description: string;
  totalDurationSeconds: number;
  groundTruthWindows: GroundTruthWindow[];
}

export interface ModelBenchmarkMetrics {
  stage: MitreStage;
  worldModel: { precision: number; recall: number; f1: number; fpr: number };
  baseline: { precision: number; recall: number; f1: number; fpr: number };
}

export interface StateUpdate {
  timestamp: string;
  nodes: HostNode[];
  edges: FlowEdge[];
  killChainProbs: KillChainProbs;
  forecast: ForecastStep[];
  globalRisk: number;
  topShap: ShapFeature[];
  activeEvents: ThreatEvent[];
}

export interface ReplayProbabilityPoint {
  timeSec: number;
  worldModelProb: number;
  baselineProb: number;
}

export interface NodeForecast {
  nodeId: string;
  tPlus: number;
  predictedStage: MitreStage;
  riskScore: number;
  shapForecast: ShapFeature[];
}
