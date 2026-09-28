import React from 'react';
import { useSentinelStore } from '../store/useSentinelStore';
import { Clock, Eye, Sparkles, AlertTriangle } from 'lucide-react';

export const TimelineScrubber: React.FC = () => {
  const { tOffset, setTOffset, mode, stateUpdate, activeScenario } = useSentinelStore();

  const isForecast = tOffset > 0;
  const isPast = tOffset < 0;

  // Horizon definition: -5 (Observed Past) -> 0 (Now) -> +5 (Forecast Horizon)
  const MIN_OFFSET = -5;
  const MAX_OFFSET = 5;

  const currentForecastStep = stateUpdate.forecast.find((f) => f.tPlus === tOffset);
  const confidencePercent = currentForecastStep ? Math.round(currentForecastStep.confidence * 100) : 94;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setTOffset(val);
  };

  return (
    <div className="flex flex-col gap-1.5 w-full bg-sentinel-surface/90 border border-sentinel-border p-2.5 rounded-lg">
      {/* Readout Header */}
      <div className="flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-sentinel-cyan" />
          <span className="text-gray-300 font-semibold">TEMPORAL SCRUBBER</span>
          <span className="text-gray-600">|</span>

          {/* Mode Indicator Readout */}
          {isForecast ? (
            <span className="flex items-center gap-1.5 text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 animate-pulse">
              <Sparkles className="w-3 h-3" />
              FORECAST STATE: T+{tOffset} Windows (Confidence: {confidencePercent}%)
            </span>
          ) : isPast ? (
            <span className="flex items-center gap-1.5 text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/30">
              <Eye className="w-3 h-3" />
              HISTORICAL REPLAY: T{tOffset} Windows
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-sentinel-cyan bg-sentinel-cyan/10 px-2 py-0.5 rounded border border-sentinel-cyan/30">
              <span className="w-1.5 h-1.5 rounded-full bg-sentinel-cyan animate-ping"></span>
              PRESENT STATE: NOW (Real-time Observation)
            </span>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] text-gray-400">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-1 bg-emerald-500 rounded"></span> Observed Past
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-sentinel-cyan"></span> Now
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-1 bg-amber-400 border border-dashed rounded"></span> K-Step Forecast
          </span>
        </div>
      </div>

      {/* Main Track & Slider */}
      <div className="relative w-full py-1">
        {/* Underlay Sparkline Curve representing Infiltration Probability */}
        <div className="absolute inset-0 h-6 top-1 opacity-20 pointer-events-none overflow-hidden">
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 20">
            <path
              d="M 0 16 Q 20 14, 40 10 T 50 6 T 70 4 T 100 2"
              fill="none"
              stroke="#3DFDC6"
              strokeWidth="2"
            />
          </svg>
        </div>

        {/* Multi-zone Track background */}
        <div className="relative w-full h-3 rounded-full flex overflow-hidden border border-sentinel-border">
          {/* Left Zone: Observed Past */}
          <div className="w-1/2 h-full bg-gradient-to-r from-emerald-950/60 to-emerald-800/40 border-r border-sentinel-cyan/50" />
          {/* Right Zone: Forecast Horizon */}
          <div className="w-1/2 h-full bg-gradient-to-r from-amber-950/40 to-red-950/40 border-dashed border-l border-amber-500/50" />
        </div>

        {/* Ground-truth markers for Replay Mode */}
        {mode === 'replay' && (
          <div className="absolute top-0 inset-x-0 h-full pointer-events-none flex justify-between px-2">
            {activeScenario.groundTruthWindows.map((gt, idx) => {
              const posPercent = (gt.timestampOffset / activeScenario.totalDurationSeconds) * 100;
              return (
                <div
                  key={idx}
                  className="absolute top-[-14px] flex flex-col items-center"
                  style={{ left: `${posPercent}%` }}
                >
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  <span className="text-[9px] font-mono text-amber-300 bg-black/80 px-1 rounded border border-amber-500/30 whitespace-nowrap">
                    {gt.stage}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Draggable HTML Range Input */}
        <input
          type="range"
          min={MIN_OFFSET}
          max={MAX_OFFSET}
          value={tOffset}
          onChange={handleSliderChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />

        {/* Visual Custom Playhead Knob */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -ml-2.5 w-5 h-5 rounded-full bg-sentinel-surface border-2 border-sentinel-cyan shadow-[0_0_12px_rgba(61,253,198,0.8)] pointer-events-none flex items-center justify-center transition-transform duration-75"
          style={{
            left: `${((tOffset - MIN_OFFSET) / (MAX_OFFSET - MIN_OFFSET)) * 100}%`,
            borderColor: isForecast ? '#F59E0B' : '#3DFDC6',
          }}
        >
          <div className={`w-1.5 h-1.5 rounded-full ${isForecast ? 'bg-amber-400 animate-ping' : 'bg-sentinel-cyan'}`} />
        </div>
      </div>

      {/* Axis Tick Labels */}
      <div className="flex justify-between text-[10px] font-mono text-gray-500 px-1">
        <span>T-5 (Observed)</span>
        <span>T-3</span>
        <span>T-1</span>
        <span className="text-sentinel-cyan font-bold">PRESENT (T=0)</span>
        <span className="text-amber-400 font-semibold">T+1 (Sim)</span>
        <span className="text-amber-400 font-semibold">T+3</span>
        <span className="text-red-400 font-semibold">T+5 (Horizon)</span>
      </div>
    </div>
  );
};
