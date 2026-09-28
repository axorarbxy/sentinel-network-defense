import React from 'react';
import type { ReplayProbabilityPoint } from '../types/sentinel';
import { SimpleBarChart, SimpleLineChart } from './SimpleCharts';

interface BenchmarkComparisonChartProps {
  mode?: 'grouped_bars' | 'probability_timeline';
  stages?: string[];
  worldF1?: number[];
  baseF1?: number[];
  replayTimeline?: ReplayProbabilityPoint[];
}

export const BenchmarkComparisonChart: React.FC<BenchmarkComparisonChartProps> = ({
  mode = 'grouped_bars',
  stages = ['Reconnaissance', 'Initial Access', 'Lateral Movement', 'Command & Control', 'Exfiltration'],
  worldF1 = [64.0, 70.0, 76.6, 74.6, 79.3],
  baseF1 = [72.0, 56.3, 66.8, 55.2, 75.8],
  replayTimeline = [],
}) => {
  const worldModelF1 = worldF1;
  const baselineF1 = baseF1;

  const timeline = replayTimeline.length > 0 ? replayTimeline : [
    { timeSec: 0, worldModelProb: 0.12, baselineProb: 0.08 },
    { timeSec: 15, worldModelProb: 0.28, baselineProb: 0.15 },
    { timeSec: 30, worldModelProb: 0.45, baselineProb: 0.22 },
    { timeSec: 45, worldModelProb: 0.72, baselineProb: 0.35 },
    { timeSec: 60, worldModelProb: 0.88, baselineProb: 0.48 },
    { timeSec: 75, worldModelProb: 0.94, baselineProb: 0.55 },
    { timeSec: 90, worldModelProb: 0.96, baselineProb: 0.62 },
    { timeSec: 105, worldModelProb: 0.98, baselineProb: 0.68 },
    { timeSec: 120, worldModelProb: 0.99, baselineProb: 0.71 },
  ];
  const timePoints = timeline.map((point) => `${point.timeSec}s`);
  const worldModelProb = timeline.map((point) => point.worldModelProb);
  const baselineProb = timeline.map((point) => point.baselineProb);

  if (mode === 'probability_timeline') {
    return (
      <div className="w-full h-full min-h-[260px] bg-sentinel-surface/90 border border-sentinel-border rounded-xl p-3 shadow-xl">
        <div className="flex items-center justify-between border-b border-sentinel-border pb-2 mb-2 font-mono text-xs">
          <span className="text-sentinel-cyan font-bold uppercase">
            Model vs. Baseline Infiltration Probability Trajectory
          </span>
          <span className="text-[10px] text-gray-400">SIH26153 Benchmark Overlay</span>
        </div>

        <SimpleLineChart labels={timePoints} max={1} series={[{ name: 'SENTINEL World-Model', values: worldModelProb, color: '#3DFDC6' }, { name: 'Logistic Regression Baseline', values: baselineProb, color: '#EF4444', dashed: true }]} />
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[300px] bg-sentinel-surface/90 border border-sentinel-border rounded-xl p-4 shadow-xl flex flex-col">
      <div className="flex items-center justify-between border-b border-sentinel-border pb-2 mb-2 font-mono text-xs">
        <span className="text-sentinel-cyan font-bold uppercase">
          F1 Score Comparison across MITRE ATT&CK Stages
        </span>
        <span className="text-[10px] text-gray-400">World Model vs. Logistic Regression</span>
      </div>

      <div className="flex-1 w-full">
        <SimpleBarChart labels={stages} max={100} series={[{ name: 'SENTINEL World-Model', values: worldModelF1, color: '#3DFDC6' }, { name: 'Logistic Regression Baseline', values: baselineF1, color: '#64748B' }]} />
      </div>
    </div>
  );
};
