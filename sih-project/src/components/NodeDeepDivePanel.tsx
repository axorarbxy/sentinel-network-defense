import React, { useEffect, useState } from 'react';
import { useSentinelStore } from '../store/useSentinelStore';
import { ShapExplainabilityStrip } from './ShapExplainabilityStrip';
import { X, Server, ShieldAlert, Activity, Network, Sparkles, Layers, Info, Power, RotateCcw } from 'lucide-react';
import { wsClient } from '../services/websocket';
import { SimpleLineChart } from './SimpleCharts';
import { API_BASE_URL } from '../config/endpoints';

export const NodeDeepDivePanel: React.FC = () => {
  const {
    selectedNodeId,
    setSelectedNodeId,
    stateUpdate,
    tOffset,
    isMockMode,
    nodeForecast,
    setNodeForecast,
    setNodeConnectionState,
  } = useSentinelStore();
  const [controlMessage, setControlMessage] = useState('');
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);

  useEffect(() => {
    if (isMockMode || !selectedNodeId) return;
    setNodeForecast(null);
    wsClient.requestNodeForecast(selectedNodeId, Math.max(1, tOffset || 3));
  }, [isMockMode, selectedNodeId, setNodeForecast, tOffset]);

  if (!selectedNodeId) return null;

  const rawNode: any = stateUpdate.nodes.find((n) => n.id === selectedNodeId) || {};
  const nodeConnectionState = rawNode.isConnected ?? true;

  const node = {
    id: selectedNodeId,
    label: rawNode.label || (selectedNodeId.startsWith('10.') ? 'INTERNAL-HOST' : 'EXTERNAL-NODE'),
    role: String(rawNode.role || 'workstation'),
    riskScore: Number(rawNode.riskScore ?? rawNode.risk_score ?? 0.72),
    bytesSent: Number(rawNode.bytesSent ?? rawNode.bytes_sent ?? 1520000),
    bytesReceived: Number(rawNode.bytesReceived ?? rawNode.bytes_recv ?? 4800000),
    flowCount: Number(rawNode.flowCount ?? rawNode.flows ?? 145),
    uniquePortsContacted: Number(rawNode.uniquePortsContacted ?? rawNode.ports ?? 38),
    ttlVariance: Number(rawNode.ttlVariance ?? 0.24),
    firstSeen: rawNode.firstSeen || '2026-09-14 00:10:00',
    lastSeen: rawNode.lastSeen || 'Just now',
    mitreStage: String(rawNode.mitreStage || rawNode.mitre_stage || 'c2'),
  };

  const postControlAction = async (path: string, body?: object) => {
    const authToken = localStorage.getItem('sentinel_auth_token') || 'sentinel-proto-token-2026';

    try {
      const res = await fetch(`${API_BASE_URL}${path}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });

      if (!res.ok) {
        throw new Error('Device control request failed');
      }
      return await res.json();
    } catch (error) {
      console.warn('Device control request failed:', error);
      setControlMessage('Control request failed. Check that the backend is running.');
      return null;
    }
  };

  const handleAutomaticDisconnect = async () => {
    const result = await postControlAction(
      `/api/devices/${encodeURIComponent(selectedNodeId)}/auto-disconnect`,
      { risk_score: node.riskScore },
    );
    if (!result) return;
    setControlMessage(result.message);
    if (result.status === 'disconnected') setNodeConnectionState(selectedNodeId, false);
  };

  const handleDisconnectRequest = async () => {
    const result = await postControlAction(
      `/api/devices/${encodeURIComponent(selectedNodeId)}/disconnect-request`,
      { risk_score: node.riskScore },
    );
    if (!result) return;
    setPendingRequestId(result.request_id || null);
    setControlMessage(result.message);
  };

  const handleApprovalDecision = async (decision: 'approve' | 'deny') => {
    if (!pendingRequestId) return;
    const result = await postControlAction(`/api/devices/requests/${pendingRequestId}`, { decision });
    if (!result) return;
    setControlMessage(result.message);
    setPendingRequestId(null);
    if (decision === 'approve') setNodeConnectionState(selectedNodeId, false);
  };

  const handleRestore = async () => {
    const result = await postControlAction(`/api/devices/${encodeURIComponent(selectedNodeId)}/restore`);
    if (!result) return;
    setControlMessage(result.message);
    setPendingRequestId(null);
    setNodeConnectionState(selectedNodeId, true);
  };

  const isForecast = tOffset > 0;

  // Time-series sparkline data adjusting dynamically for forecast state T+k
  const timeLabels = ['T-4', 'T-3', 'T-2', 'T-1', 'NOW', 'T+1', 'T+2', 'T+3', 'T+4', 'T+5'];
  const baseBytes = node.bytesSent / 1000;
  const bytesData = [
    baseBytes * 0.4,
    baseBytes * 0.5,
    baseBytes * 0.7,
    baseBytes * 0.9,
    baseBytes,
    baseBytes * (1 + tOffset * 0.25),
    baseBytes * (1 + tOffset * 0.45),
    baseBytes * (1 + tOffset * 0.7),
    baseBytes * (1 + tOffset * 0.95),
    baseBytes * (1 + tOffset * 1.2),
  ];
  const flowData = [
    12,
    18,
    25,
    45,
    node.flowCount,
    node.flowCount + tOffset * 12,
    node.flowCount + tOffset * 24,
    node.flowCount + tOffset * 38,
    node.flowCount + tOffset * 55,
    node.flowCount + tOffset * 70,
  ];

  const riskPercent = Number((node.riskScore * 100).toFixed(1));

  return (
    <div
      className={`absolute top-3 bottom-3 right-3 w-[360px] max-w-[calc(100%-1.5rem)] z-30 min-h-0 bg-sentinel-surface border border-l backdrop-blur-xl shadow-2xl flex flex-col transition-all duration-300 max-md:top-auto max-md:bottom-2 max-md:left-2 max-md:right-2 max-md:w-auto max-md:max-h-[65%] ${
        isForecast
          ? 'border-amber-500/60 shadow-[0_0_30px_rgba(245,158,11,0.25)]'
          : 'border-sentinel-border'
      }`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2.5 border-b ${isForecast ? 'bg-amber-950/40 border-amber-500/40' : 'bg-sentinel-surface-light border-sentinel-border'}`}>
        <div className="flex items-center gap-2 overflow-hidden">
          <Server className={`w-4 h-4 shrink-0 ${isForecast ? 'text-amber-400' : 'text-sentinel-cyan'}`} />
          <div className="overflow-hidden">
            <h3 className="text-xs font-mono font-bold text-gray-100 flex items-center gap-1.5 truncate">
              <span className="truncate">{node.id}</span>
              {isForecast && (
                <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 font-mono animate-pulse shrink-0">
                  <Sparkles className="w-2.5 h-2.5 text-amber-400" /> T+{tOffset}
                </span>
              )}
            </h3>
            <span className="text-[10px] text-gray-400 font-mono block truncate">{node.label || node.role}</span>
          </div>
        </div>

        <button
          onClick={() => setSelectedNodeId(null)}
          className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-sentinel-border transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-3 pt-3">
        <div className="flex items-center justify-between gap-2 rounded-lg border border-sentinel-border bg-sentinel-surface-card p-2">
          <div className="flex items-center gap-2 text-[10px] font-mono">
            <span className={`inline-flex h-2.5 w-2.5 rounded-full ${nodeConnectionState ? 'bg-emerald-400' : 'bg-rose-400'}`} />
            <span className={nodeConnectionState ? 'text-emerald-300' : 'text-rose-300'}>
              {nodeConnectionState ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {nodeConnectionState ? (
            <div className="flex flex-wrap justify-end gap-1">
              <button
                onClick={handleAutomaticDisconnect}
                className="flex items-center gap-1 rounded-md border border-amber-500/50 bg-amber-500/10 px-2 py-1 text-[10px] font-mono text-amber-200 hover:bg-amber-500/20 transition-colors"
                title="Disconnect automatically only when risk is at or below 30%"
              >
                <Power className="w-3 h-3" />
                Auto low-threat
              </button>
              <button
                onClick={handleDisconnectRequest}
                className="flex items-center gap-1 rounded-md border border-rose-500/50 bg-rose-500/10 px-2 py-1 text-[10px] font-mono text-rose-200 hover:bg-rose-500/20 transition-colors"
              >
                <Power className="w-3 h-3" />
                Request approval
              </button>
            </div>
          ) : (
            <button
              onClick={handleRestore}
              className="flex items-center gap-1.5 rounded-md border border-emerald-500/50 bg-emerald-500/10 px-2 py-1 text-[10px] font-mono text-emerald-200 hover:bg-emerald-500/20 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Restore
            </button>
          )}
        </div>
        {pendingRequestId && nodeConnectionState && (
          <div className="mt-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-[10px] font-mono text-amber-200">
            <div>Pending administrator authorization</div>
            <div className="mt-1 flex gap-1">
              <button onClick={() => handleApprovalDecision('approve')} className="rounded border border-emerald-500/50 px-2 py-1 text-emerald-200">Permit disconnect</button>
              <button onClick={() => handleApprovalDecision('deny')} className="rounded border border-gray-500/50 px-2 py-1 text-gray-300">Deny</button>
            </div>
          </div>
        )}
        {controlMessage && <div className="mt-2 text-[10px] font-mono text-gray-400">{controlMessage}</div>}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Forecast Register Notice if active */}
        {isForecast && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-mono leading-tight">
            <Layers className="w-3.5 h-3.5 shrink-0 text-amber-400" />
            <span>Simulated Telemetry at Horizon T+{tOffset}</span>
          </div>
        )}

        {/* Host Identity Spec Sheet */}
        <div className="grid grid-cols-2 gap-2 bg-sentinel-surface-card p-2.5 rounded-lg border border-sentinel-border text-[11px] font-mono">
          <div>
            <span className="text-gray-500 text-[9px] block uppercase">Role Spec</span>
            <span className="text-sentinel-cyan font-bold capitalize truncate block">{node.role.replace('_', ' ')}</span>
          </div>

          <div>
            <span className="text-gray-500 text-[9px] block uppercase flex items-center gap-1">
              MITRE Stage
              <span title="Stage is most frequent non‑benign stage for this host; risk score reflects aggregated threat probability.">
                <Info className="w-3 h-3 text-gray-500 cursor-help" aria-label="MITRE stage tooltip" />
              </span>
            </span>
            <span className="text-red-400 font-bold uppercase truncate block">{node.mitreStage.replace('_', ' ')}</span>
          </div>

          <div>
            <span className="text-gray-500 text-[9px] block uppercase">Bytes Sent / Recv</span>
            <span className="text-gray-200 block truncate">
              {(node.bytesSent / 1024 / 1024).toFixed(1)}MB / {(node.bytesReceived / 1024 / 1024).toFixed(1)}MB
            </span>
          </div>

          <div>
            <span className="text-gray-500 text-[9px] block uppercase">Flows / Ports</span>
            <span className="text-gray-200 block truncate">
              {node.flowCount} / {node.uniquePortsContacted}
            </span>
          </div>
        </div>

        {/* Per-Host Risk Score Gauge Bar */}
        <div className="p-2.5 bg-sentinel-surface-card rounded-lg border border-sentinel-border flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-gray-300 font-semibold flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-red-400" />
              HOST RISK ASSESSOR {isForecast ? `(T+${tOffset})` : ''}
            </span>
            <span className={`font-bold text-xs ${riskPercent >= 80 ? 'text-red-400' : 'text-amber-400'}`}>
              {riskPercent}%
            </span>
          </div>

          <div className="w-full bg-black/60 h-2 rounded-full overflow-hidden border border-white/5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isForecast ? 'bg-gradient-to-r from-amber-500 to-red-600' : 'bg-gradient-to-r from-teal-500 via-amber-500 to-red-500'
              }`}
              style={{ width: `${riskPercent}%` }}
            />
          </div>
        </div>

        {/* Plotly Sparklines: Traffic & Flow Multiples */}
        <div className="p-2.5 bg-sentinel-surface-card rounded-lg border border-sentinel-border">
          <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
            <span className="text-sentinel-cyan font-bold flex items-center gap-1">
              <Activity className="w-3 h-3" />
              TRAFFIC TELEMETRY SPARKLINE
            </span>
              <span className="text-[9px] text-gray-500">Live telemetry</span>
          </div>

          <div className="w-full h-28 bg-black/30 rounded overflow-hidden">
            <SimpleLineChart
              labels={timeLabels}
              max={Math.max(...bytesData, ...flowData, 1)}
              series={[
                { name: 'KB Transferred', values: bytesData, color: isForecast ? '#F59E0B' : '#3DFDC6' },
                { name: 'Active Flows', values: flowData, color: '#F97316', dashed: true },
              ]}
            />
          </div>
        </div>

        {/* SHAP Feature Attribution Panel for Host */}
        <div className="p-2.5 bg-sentinel-surface-card rounded-lg border border-sentinel-border">
          <ShapExplainabilityStrip
            features={stateUpdate.topShap || (stateUpdate as any).shap_present || (stateUpdate as any).shapPresent || []}
            title={`Host ${node.id} SHAP Drivers (${isForecast ? `Forecast T+${tOffset}` : 'Present'})`}
            compact
          />
        </div>

        {/* Predicted MITRE Stage Trajectory over K Steps */}
        <div className="p-2.5 bg-sentinel-surface-card rounded-lg border border-sentinel-border flex flex-col gap-1.5">
          <span className="text-[11px] font-mono font-bold text-gray-200 flex items-center gap-1">
            <Network className="w-3 h-3 text-purple-400" />
            FORECASTED MITRE TRAJECTORY
          </span>

          <div className="flex flex-col gap-1 text-[11px] font-mono">
            {(nodeForecast ? [{
              tPlus: nodeForecast.tPlus,
              predictedStage: nodeForecast.predictedStage,
              risk_score: nodeForecast.riskScore,
              shap_forecast: nodeForecast.shapForecast,
            }] : stateUpdate.forecast || []).map((fc: any, idx: number) => {
              const stageName = String(fc.predictedStage || fc.predicted_stage || 'benign');
              const tPlusVal = fc.tPlus ?? fc.t_plus ?? (idx + 1);
              const tsOffsetVal = fc.timestampOffsetSec ?? (tPlusVal * 15);
              const probVal = fc.infiltrationProb ?? fc.infiltration_prob ?? 0.1;
              const host = fc;

              return (
                <div
                  key={tPlusVal}
                  className={`flex items-center justify-between p-1.5 rounded border transition-all ${
                    tOffset === tPlusVal
                      ? 'bg-amber-500/25 border-amber-500 text-amber-200 font-bold shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                      : 'bg-sentinel-surface-light/40 border-transparent text-gray-400'
                  }`}
                >
                  <span className="flex items-center gap-1 text-[10px]">
                    {tOffset === tPlusVal && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>}
                    T+{tPlusVal} ({tsOffsetVal}s)
                  </span>
                  <span className="uppercase text-[10px] font-semibold text-red-400 truncate">
                    {stageName.replace('_', ' ')}
                  </span>
                  <span className="text-sentinel-cyan text-[10px] font-bold">
                    {((host.risk_score ?? probVal) * 100).toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
