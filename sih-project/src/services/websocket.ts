import type { NodeForecast, ReplayProbabilityPoint, StateUpdate } from '../types/sentinel';
import { WS_BASE_URL } from '../config/endpoints';
import { useSentinelStore } from '../store/useSentinelStore';

type JsonRecord = Record<string, unknown>;

const asRecord = (value: unknown): JsonRecord =>
  typeof value === 'object' && value !== null ? (value as JsonRecord) : {};

const asRecords = (value: unknown): JsonRecord[] =>
  Array.isArray(value) ? value.map(asRecord) : [];

const asNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' && value.trim() !== '' ? value : fallback;

const normalizeShapFeatures = (value: unknown): StateUpdate['topShap'] =>
  asRecords(value).map((feature) => ({
    feature: asString(feature.feature, 'unknown'),
    value: asNumber(feature.value),
    contribution: asNumber(feature.contribution),
    description: asString(feature.description),
  }));

const normalizeNodeForecast = (payload: unknown): NodeForecast | null => {
  const data = asRecord(payload);
  if (data.type !== 'node_forecast_response') return null;
  return {
    nodeId: asString(data.node_id),
    tPlus: asNumber(data.t_plus),
    predictedStage: asString(data.predicted_stage, 'benign') as NodeForecast['predictedStage'],
    riskScore: asNumber(data.risk_score),
    shapForecast: normalizeShapFeatures(data.shap_forecast),
  };
};

export const normalizeStateUpdate = (payload: unknown): StateUpdate | null => {
  const data = asRecord(payload);
  if (data.type !== 'state_update' && data.type !== 'replay_state_update') return null;

  const timestamp = asString(data.timestamp, new Date().toISOString());
  const rawKillChain = asRecord(data.kill_chain_probs ?? data.killChainProbs);

  return {
    timestamp,
    nodes: asRecords(data.nodes).map((node, index) => ({
      id: asString(node.id, `node-${index}`),
      label: asString(node.label),
      role: asString(node.role, 'workstation') as StateUpdate['nodes'][number]['role'],
      riskScore: asNumber(node.riskScore ?? node.risk_score),
      bytesSent: asNumber(node.bytesSent ?? node.bytes_sent),
      bytesReceived: asNumber(node.bytesReceived ?? node.bytes_recv),
      flowCount: asNumber(node.flowCount ?? node.flows),
      uniquePortsContacted: asNumber(node.uniquePortsContacted ?? node.ports),
      ttlVariance: asNumber(node.ttlVariance ?? node.ttl_variance),
      firstSeen: asString(node.firstSeen ?? node.first_seen, timestamp),
      lastSeen: asString(node.lastSeen ?? node.last_seen, 'Just now'),
      mitreStage: asString(node.mitreStage ?? node.mitre_stage, 'benign') as StateUpdate['nodes'][number]['mitreStage'],
      isGhost: Boolean(node.isGhost ?? node.is_ghost),
    })),
    edges: asRecords(data.edges).map((edge, index) => {
      const src = asString(edge.src, 'unknown');
      const dst = asString(edge.dst, 'unknown');
      return {
        id: asString(edge.id, `${src}->${dst}-${index}`),
        src,
        dst,
        bytes: asNumber(edge.bytes),
        packets: asNumber(edge.packets),
        protocol: asString(edge.protocol, 'TCP') as StateUpdate['edges'][number]['protocol'],
        flags: asString(edge.flags),
        riskScore: asNumber(edge.riskScore ?? edge.risk),
        iatVariance: asNumber(edge.iatVariance ?? edge.iat_variance),
        isGhost: Boolean(edge.isGhost ?? edge.is_ghost),
        shap: normalizeShapFeatures(edge.shap),
      };
    }),
    killChainProbs: {
      recon: asNumber(rawKillChain.recon),
      initial_access: asNumber(rawKillChain.initial_access),
      lateral_movement: asNumber(rawKillChain.lateral_movement),
      c2: asNumber(rawKillChain.c2),
      exfiltration: asNumber(rawKillChain.exfiltration),
    },
    forecast: asRecords(data.forecast).map((step, index) => {
      const tPlus = asNumber(step.tPlus ?? step.t_plus, index + 1);
      const predictedRiskNodes = Array.isArray(step.predictedRiskNodes)
        ? step.predictedRiskNodes.filter((node): node is string => typeof node === 'string')
        : [];
      return {
        tPlus,
        infiltrationProb: asNumber(step.infiltrationProb ?? step.infiltration_prob),
        predictedStage: asString(step.predictedStage ?? step.predicted_stage, 'benign') as StateUpdate['forecast'][number]['predictedStage'],
        predictedRiskNodes,
        confidence: asNumber(step.confidence),
        timestampOffsetSec: asNumber(step.timestampOffsetSec ?? step.timestamp_offset_sec, tPlus * 15),
      };
    }),
    globalRisk: asNumber(data.globalRisk ?? data.global_risk),
    topShap: normalizeShapFeatures(data.topShap ?? data.shap_present ?? data.shapPresent),
    activeEvents: asRecords(data.activeEvents ?? data.active_events).map((event, index) => ({
      id: asString(event.id, `event-${index}`),
      timestamp: asString(event.timestamp, timestamp),
      src: asString(event.src),
      dst: asString(event.dst),
      protocol: asString(event.protocol),
      riskScore: asNumber(event.riskScore ?? event.risk_score),
      stage: asString(event.stage, 'benign') as StateUpdate['activeEvents'][number]['stage'],
      summary: asString(event.summary),
    })),
  };
};

export class SentinelWebSocketClient {
  private socket: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectIntervalMs = 3000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = false;

  constructor(url: string = `${WS_BASE_URL}/ws`) {
    this.url = url;
  }

  public connect() {
    this.shouldReconnect = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const store = useSentinelStore.getState();
    if (store.isMockMode) {
      console.log('[SENTINEL WS] Running in standalone mock mode. Skipping WebSocket connect.');
      return;
    }

    try {
      store.setWsStatus('reconnecting');
      const token = store.authToken || 'sentinel-proto-token-2026';
      const wsUrl = this.url.includes('?') ? `${this.url}&token=${token}` : `${this.url}?token=${token}`;
      this.socket = new WebSocket(wsUrl);


      this.socket.onopen = () => {
        console.log('[SENTINEL WS] Connected to FastAPI backend:', this.url);
        useSentinelStore.getState().setWsStatus('connected');
        this.reconnectAttempts = 0;
      };

      this.socket.onmessage = (event) => {
        try {
          const payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          const data = normalizeStateUpdate(payload);
          if (data) {
            useSentinelStore.getState().setStateUpdate(data);
            return;
          }
          const forecast = normalizeNodeForecast(payload);
          if (forecast) {
            useSentinelStore.getState().setNodeForecast(forecast);
          }
        } catch (err) {
          console.error('[SENTINEL WS] Error parsing state update message:', err);
        }
      };

      this.socket.onerror = (err) => {
        console.warn('[SENTINEL WS] Socket error:', err);
      };

      this.socket.onclose = () => {
        console.warn('[SENTINEL WS] Connection closed.');
        this.handleReconnect();
      };
    } catch (err) {
      console.error('[SENTINEL WS] Failed to initiate connection:', err);
      this.handleReconnect();
    }
  }

  private handleReconnect() {
    const store = useSentinelStore.getState();
    if (!this.shouldReconnect || store.isMockMode) return;

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts += 1;
      store.setWsStatus('reconnecting');
      console.log(`[SENTINEL WS] Reconnecting attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        if (this.shouldReconnect) this.connect();
      }, this.reconnectIntervalMs);
    } else {
      console.warn('[SENTINEL WS] Max reconnect attempts reached. Falling back to Standalone Mock Engine.');
      store.setMockMode(true);
    }
  }

  public disconnect() {
    this.shouldReconnect = false;
    this.reconnectAttempts = 0;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  public requestNodeForecast(nodeId: string, tPlus: number) {
    if (this.socket?.readyState !== WebSocket.OPEN) return false;
    this.socket.send(JSON.stringify({ type: 'request_node_forecast', node_id: nodeId, t_plus: tPlus }));
    return true;
  }
}

export const wsClient = new SentinelWebSocketClient();

export interface ReplayStateFrame {
  stateUpdate: StateUpdate;
  currentTimeSec: number;
  probabilityPoint: ReplayProbabilityPoint | null;
}

export class SentinelReplayWebSocketClient {
  private socket: WebSocket | null = null;

  public connect(scenarioId: string, onFrame: (frame: ReplayStateFrame) => void) {
    this.disconnect();

    const store = useSentinelStore.getState();
    const token = store.authToken || 'sentinel-proto-token-2026';
    const params = new URLSearchParams({ scenario_id: scenarioId, token });
    this.socket = new WebSocket(`${WS_BASE_URL}/ws/replay?${params.toString()}`);

    this.socket.onopen = () => {
      useSentinelStore.getState().setWsStatus('connected');
    };

    this.socket.onmessage = (event) => {
      try {
        const payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        const stateUpdate = normalizeStateUpdate(payload);
        if (stateUpdate) {
          const data = asRecord(payload);
          onFrame({
            stateUpdate,
            currentTimeSec: asNumber(data.current_time_sec),
            probabilityPoint: asRecord(data.model_vs_baseline).time_sec === undefined
              ? null
              : {
                  timeSec: asNumber(asRecord(data.model_vs_baseline).time_sec),
                  worldModelProb: asNumber(asRecord(data.model_vs_baseline).world_model_prob),
                  baselineProb: asNumber(asRecord(data.model_vs_baseline).baseline_prob),
                },
          });
        }
      } catch (err) {
        console.error('[SENTINEL Replay WS] Error parsing replay frame:', err);
      }
    };

    this.socket.onerror = (err) => {
      console.warn('[SENTINEL Replay WS] Socket error:', err);
    };
  }

  public disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  public sendControl(command: 'play' | 'pause' | 'reset' | 'seek' | 'speed', value?: number) {
    if (this.socket?.readyState !== WebSocket.OPEN) return false;
    this.socket.send(JSON.stringify({ command, ...(value === undefined ? {} : { value, time_sec: value }) }));
    return true;
  }
}
