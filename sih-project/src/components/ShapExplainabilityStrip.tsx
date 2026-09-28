import React from 'react';
import type { ShapFeature } from '../types/sentinel';
import { HelpCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface ShapExplainabilityStripProps {
  features: ShapFeature[];
  title?: string;
  compact?: boolean;
}

export const ShapExplainabilityStrip: React.FC<ShapExplainabilityStripProps> = ({
  features,
  title = 'SHAP Feature Attribution (Why?)',
  compact = false,
}) => {
  if (!features || features.length === 0) {
    return (
      <div className="text-xs text-gray-500 italic p-2 border border-dashed border-sentinel-border rounded">
        No SHAP attribution data available.
      </div>
    );
  }

  // Find max contribution for proportional bar scaling
  const maxAbsContrib = Math.max(...features.map((f) => Math.abs(f.contribution)), 0.01);

  return (
    <div className="flex flex-col gap-2 w-full">
      {title && (
        <div className="flex items-center justify-between border-b border-sentinel-border pb-1">
          <div className="flex items-center gap-1.5 text-xs font-mono font-semibold uppercase tracking-wider text-sentinel-cyan">
            <span className="w-1.5 h-1.5 rounded-full bg-sentinel-cyan animate-pulse"></span>
            {title}
          </div>
          <span className="text-[10px] text-gray-400 font-mono">
            Red = Malicious (+) | Cyan = Benign (-)
          </span>
        </div>
      )}

      <div className={`my-1 ${compact ? 'grid grid-cols-2 gap-1' : 'flex flex-col gap-2'}`}>
        {features.map((item, idx) => {
          const isMaliciousPush = item.contribution >= 0;
          const barWidthPercent = Math.min(100, Math.round((Math.abs(item.contribution) / maxAbsContrib) * 100));

          return (
            <div
              key={idx}
              className={`group relative flex min-w-0 flex-col gap-1 rounded bg-sentinel-surface-light/40 hover:bg-sentinel-surface-light border border-transparent hover:border-sentinel-border transition-all ${compact ? 'p-1' : 'p-1.5'}`}
            >
              <div className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-1 overflow-hidden">
                  {isMaliciousPush ? (
                    <ArrowUpRight className="w-3 h-3 text-red-400 shrink-0" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 text-sentinel-cyan shrink-0" />
                  )}
                  <span className="text-gray-200 font-medium truncate" title={item.feature}>
                    {item.feature}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    ({typeof item.value === 'number' ? item.value.toFixed(3) : item.value})
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <span
                    className={`font-semibold font-mono text-[11px] ${
                      isMaliciousPush ? 'text-red-400' : 'text-sentinel-cyan'
                    }`}
                  >
                    {isMaliciousPush ? `+${item.contribution.toFixed(2)}` : item.contribution.toFixed(2)}
                  </span>
                  <HelpCircle className="w-3 h-3 text-gray-500 opacity-60 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>

              {/* Dynamic Bar */}
              <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden flex items-center">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isMaliciousPush
                      ? 'bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                      : 'bg-gradient-to-r from-teal-600 to-sentinel-cyan shadow-[0_0_8px_rgba(61,253,198,0.5)]'
                  }`}
                  style={{ width: `${barWidthPercent}%` }}
                />
              </div>

              {/* Tooltip on hover */}
              {!compact && (
                <div className="hidden group-hover:block text-[11px] text-gray-300 font-sans mt-1 p-1.5 bg-black/90 border border-sentinel-border rounded shadow-lg z-20">
                  {item.description}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
