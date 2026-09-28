import React from 'react';
import { useSentinelStore } from '../store/useSentinelStore';
import { ShapExplainabilityStrip } from './ShapExplainabilityStrip';
import { X, ArrowRight, Zap } from 'lucide-react';

export const EdgeDetailPopover: React.FC = () => {
  const { selectedEdgeId, setSelectedEdgeId, stateUpdate } = useSentinelStore();

  if (!selectedEdgeId) return null;

  const edge = stateUpdate.edges.find((e) => e.id === selectedEdgeId) || {
    id: selectedEdgeId,
    src: '10.0.0.5',
    dst: '198.51.100.42',
    bytes: 1420000,
    packets: 1250,
    protocol: 'HTTPS' as const,
    flags: 'TLS1.3-ENC',
    riskScore: 0.89,
    iatVariance: 0.002,
    shap: stateUpdate.topShap.slice(0, 3),
  };

  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[380px] max-w-[calc(100%-1rem)] max-h-[45%] overflow-y-auto overscroll-contain z-40 glass-panel-accent rounded-xl p-3.5 shadow-2xl flex flex-col gap-2">
      <div className="flex items-center justify-between border-b border-sentinel-border pb-1.5">
        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-sentinel-cyan">
          <Zap className="w-4 h-4 text-amber-400" />
          ACTIVE FLOW INSTRUMENTATION
        </div>
        <button
          onClick={() => setSelectedEdgeId(null)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center justify-between bg-black/60 px-2.5 py-1.5 rounded border border-white/5 font-mono text-xs">
        <span className="text-sentinel-cyan font-semibold">{edge.src}</span>
        <ArrowRight className="w-3.5 h-3.5 text-gray-500 mx-1" />
        <span className="text-gray-200 font-semibold">{edge.dst}</span>
        <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-1 rounded">
          {edge.protocol}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1.5 text-[11px] font-mono text-gray-300 bg-sentinel-surface/80 p-2 rounded border border-sentinel-border">
        <div>
          <span className="text-[9px] text-gray-500 block">FLAGS</span>
          <span className="font-bold text-gray-200">{edge.flags}</span>
        </div>
        <div>
          <span className="text-[9px] text-gray-500 block">BYTES / PKTS</span>
          <span className="font-bold text-gray-200">
            {(edge.bytes / 1024).toFixed(0)}KB ({edge.packets})
          </span>
        </div>
        <div>
          <span className="text-[9px] text-gray-500 block">IAT VARIANCE</span>
          <span className="font-bold text-red-400">{edge.iatVariance}s</span>
        </div>
      </div>

      {edge.shap && edge.shap.length > 0 && (
        <ShapExplainabilityStrip features={edge.shap} title="Flow SHAP Contribution" compact />
      )}
    </div>
  );
};
