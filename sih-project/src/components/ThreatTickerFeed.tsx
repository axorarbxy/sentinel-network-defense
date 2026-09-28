import React from 'react';
import { useSentinelStore } from '../store/useSentinelStore';
import { ArrowRight, Activity, Terminal } from 'lucide-react';

export const ThreatTickerFeed: React.FC = () => {
  const { stateUpdate, selectedNodeId, setSelectedNodeId, isMockMode } = useSentinelStore();
  const events = stateUpdate.activeEvents;

  const getRiskChip = (score: number) => {
    if (score >= 0.85) return 'bg-red-500/20 text-red-400 border-red-500/40';
    if (score >= 0.6) return 'bg-orange-500/20 text-orange-400 border-orange-500/40';
    if (score >= 0.4) return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
    return 'bg-teal-500/20 text-sentinel-cyan border-teal-500/40';
  };

  return (
    <div className="flex flex-col h-full bg-sentinel-surface/90 border border-sentinel-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-sentinel-surface-light border-b border-sentinel-border">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-sentinel-cyan" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-gray-200">
            Threat Telemetry Feed
          </span>
        </div>
        <span className={`flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border ${isMockMode ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' : 'text-sentinel-cyan bg-sentinel-cyan/10 border-sentinel-cyan/30'}`}>
          <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isMockMode ? 'bg-amber-400' : 'bg-sentinel-cyan'}`}></span>
          {isMockMode ? 'SIMULATION' : 'LIVE WS'}
        </span>
      </div>

      {/* Auto-scrolling Event List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 radar-scan">
        {events.map((evt) => {
          const isSelected = selectedNodeId === evt.src || selectedNodeId === evt.dst;
          const chipStyle = getRiskChip(evt.riskScore);

          return (
            <div
              key={evt.id}
              onClick={() => setSelectedNodeId(evt.src)}
              className={`p-2.5 rounded-lg border text-xs font-mono transition-all cursor-pointer ${
                isSelected
                  ? 'bg-sentinel-surface-card border-sentinel-cyan shadow-[0_0_12px_rgba(61,253,198,0.2)]'
                  : 'bg-sentinel-surface/70 border-sentinel-border hover:border-gray-600 hover:bg-sentinel-surface-light'
              }`}
            >
              {/* Event Top Bar */}
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-sentinel-cyan" />
                  {evt.timestamp}
                </span>

                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-bold bg-sentinel-surface-light text-gray-300 border border-gray-700">
                    {evt.stage.replace('_', ' ')}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${chipStyle}`}>
                    {(evt.riskScore * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Source -> Destination IP flow */}
              <div className="flex items-center justify-between bg-black/40 px-2 py-1 rounded border border-white/5 my-1 font-semibold">
                <span className="text-sentinel-cyan truncate">{evt.src}</span>
                <ArrowRight className="w-3 h-3 text-gray-500 shrink-0 mx-1" />
                <span className="text-gray-200 truncate">{evt.dst}</span>
                <span className="text-[10px] text-gray-500 font-normal ml-1">({evt.protocol})</span>
              </div>

              {/* Event Summary */}
              <p className="text-[11px] font-sans text-gray-300 mt-1 leading-snug line-clamp-2">
                {evt.summary}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
