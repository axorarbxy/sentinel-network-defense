import React from 'react';

interface LineSeries {
  name: string;
  values: number[];
  color: string;
  dashed?: boolean;
}

interface LineChartProps {
  labels: string[];
  series: LineSeries[];
  max?: number;
}

export const SimpleLineChart: React.FC<LineChartProps> = ({ labels, series, max = 1 }) => {
  const width = 640;
  const height = 260;
  const pad = { top: 24, right: 18, bottom: 42, left: 42 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const x = (index: number) => pad.left + (labels.length <= 1 ? 0 : (index / (labels.length - 1)) * plotWidth);
  const y = (value: number) => pad.top + plotHeight - (Math.max(0, Math.min(max, value)) / max) * plotHeight;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" role="img" aria-label="Line chart">
      {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
        <g key={tick}>
          <line x1={pad.left} x2={width - pad.right} y1={y(tick * max)} y2={y(tick * max)} stroke="rgba(255,255,255,0.08)" />
          <text x={pad.left - 8} y={y(tick * max) + 4} textAnchor="end" fill="#94A3B8" fontSize="10">{Math.round(tick * max * 100)}%</text>
        </g>
      ))}
      {labels.map((label, index) => (
        <text key={label} x={x(index)} y={height - 15} textAnchor="middle" fill="#94A3B8" fontSize="10">{label}</text>
      ))}
      {series.map((item) => (
        <polyline
          key={item.name}
          fill="none"
          stroke={item.color}
          strokeWidth="3"
          strokeDasharray={item.dashed ? '5 4' : undefined}
          points={item.values.map((value, index) => `${x(index)},${y(value)}`).join(' ')}
        />
      ))}
      {series.map((item) => item.values.map((value, index) => (
        <circle key={`${item.name}-${index}`} cx={x(index)} cy={y(value)} r="3" fill={item.color} />
      )))}
      {series.map((item, index) => (
        <text key={item.name} x={pad.left + index * 180} y={14} fill={item.color} fontSize="10">{item.name}</text>
      ))}
    </svg>
  );
};

interface BarChartProps {
  labels: string[];
  series: LineSeries[];
  max?: number;
}

export const SimpleBarChart: React.FC<BarChartProps> = ({ labels, series, max = 100 }) => {
  const width = 640;
  const height = 280;
  const pad = { top: 28, right: 18, bottom: 56, left: 42 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const groupWidth = plotWidth / Math.max(1, labels.length);
  const barWidth = Math.min(28, groupWidth / Math.max(1, series.length + 1));
  const y = (value: number) => pad.top + plotHeight - (Math.max(0, Math.min(max, value)) / max) * plotHeight;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" role="img" aria-label="Bar chart">
      {[0, 25, 50, 75, 100].map((tick) => (
        <g key={tick}>
          <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} stroke="rgba(255,255,255,0.08)" />
          <text x={pad.left - 8} y={y(tick) + 4} textAnchor="end" fill="#94A3B8" fontSize="10">{tick}</text>
        </g>
      ))}
      {labels.map((label, labelIndex) => (
        <g key={label}>
          {series.map((item, seriesIndex) => {
            const value = item.values[labelIndex] ?? 0;
            const barHeight = plotHeight - (y(value) - pad.top);
            const x = pad.left + labelIndex * groupWidth + (groupWidth - series.length * barWidth) / 2 + seriesIndex * barWidth;
            return <rect key={item.name} x={x} y={y(value)} width={barWidth - 2} height={barHeight} fill={item.color} rx="2" />;
          })}
          <text x={pad.left + labelIndex * groupWidth + groupWidth / 2} y={height - 22} textAnchor="middle" fill="#94A3B8" fontSize="9">{label}</text>
        </g>
      ))}
      {series.map((item, index) => <text key={item.name} x={pad.left + index * 180} y={14} fill={item.color} fontSize="10">{item.name}</text>)}
    </svg>
  );
};

interface HeatmapProps {
  labels: string[];
  values: number[][];
}

export const SimpleHeatmap: React.FC<HeatmapProps> = ({ labels, values }) => {
  const max = Math.max(...values.flat(), 1);
  const cell = 38;
  const left = 82;
  const top = 30;
  return (
    <svg viewBox={`0 0 ${left + labels.length * cell + 8} ${top + labels.length * cell + 34}`} className="w-full h-full" role="img" aria-label="Confusion matrix heatmap">
      {labels.map((label, index) => <text key={`x-${label}`} x={left + index * cell + cell / 2} y={20} textAnchor="middle" fill="#94A3B8" fontSize="8">{label}</text>)}
      {labels.map((label, index) => <text key={`y-${label}`} x={left - 5} y={top + index * cell + cell / 2 + 3} textAnchor="end" fill="#94A3B8" fontSize="8">{label}</text>)}
      {values.map((row, rowIndex) => row.map((value, columnIndex) => {
        const intensity = value / max;
        return <g key={`${rowIndex}-${columnIndex}`}><rect x={left + columnIndex * cell} y={top + rowIndex * cell} width={cell - 2} height={cell - 2} fill={`rgb(${Math.round(10 + intensity * 51)}, ${Math.round(14 + intensity * 239)}, ${Math.round(20 + intensity * 178)})`} rx="2" /><text x={left + columnIndex * cell + cell / 2} y={top + rowIndex * cell + cell / 2 + 3} textAnchor="middle" fill="#E2E8F0" fontSize="9">{value}</text></g>;
      }))}
    </svg>
  );
};
