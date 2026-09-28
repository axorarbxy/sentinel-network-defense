import React from 'react';

interface RadialRiskGaugeProps {
  score: number; // 0.0 to 1.0
  size?: number;
  label?: string;
}

export const RadialRiskGauge: React.FC<RadialRiskGaugeProps> = ({
  score,
  size = 54,
  label = 'GLOBAL RISK',
}) => {
  const percentage = Math.min(100, Math.max(0, Math.round(score * 100)));
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Determine color theme based on score threshold
  const getColor = (val: number) => {
    if (val >= 80) return { stroke: '#EF4444', glow: 'rgba(239, 68, 68, 0.4)', text: 'text-red-400' };
    if (val >= 50) return { stroke: '#F97316', glow: 'rgba(249, 115, 22, 0.4)', text: 'text-orange-400' };
    if (val >= 35) return { stroke: '#EAB308', glow: 'rgba(234, 179, 8, 0.4)', text: 'text-yellow-400' };
    return { stroke: '#3DFDC6', glow: 'rgba(61, 253, 198, 0.4)', text: 'text-sentinel-cyan' };
  };

  const theme = getColor(percentage);

  return (
    <div className="flex items-center gap-2.5 px-3 py-1 bg-sentinel-surface/80 border border-sentinel-border rounded-lg shadow-sm">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="4"
            fill="transparent"
          />
          {/* Animated score circle track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.stroke}
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            style={{
              transition: 'stroke-dashoffset 0.8s ease-out, stroke 0.5s ease',
              filter: `drop-shadow(0 0 6px ${theme.glow})`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className={`font-mono text-xs font-bold ${theme.text}`}>
            {percentage}%
          </span>
        </div>
      </div>

      <div className="flex flex-col justify-center">
        <span className="text-[10px] font-mono tracking-widest text-gray-400 uppercase font-semibold">
          {label}
        </span>
        <span className={`text-xs font-mono font-medium ${theme.text}`}>
          {percentage >= 80 ? 'CRITICAL RISK' : percentage >= 50 ? 'HIGH THREAT' : percentage >= 35 ? 'ELEVATED' : 'NOMINAL'}
        </span>
      </div>
    </div>
  );
};
