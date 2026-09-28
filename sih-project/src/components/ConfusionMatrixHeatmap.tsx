import React from 'react';
import { SimpleHeatmap } from './SimpleCharts';

interface ConfusionMatrixHeatmapProps {
  modelName?: string;
  zValues?: number[][];
}

export const ConfusionMatrixHeatmap: React.FC<ConfusionMatrixHeatmapProps> = ({
  modelName = 'SENTINEL Predictive World-Model',
  zValues = [
    [263, 22, 8, 14, 23, 25],
    [69, 212, 22, 21, 19, 17],
    [0, 68, 175, 27, 5, 0],
    [2, 0, 20, 210, 35, 0],
    [5, 0, 0, 9, 235, 18],
    [6, 0, 0, 0, 46, 214],
  ],
}) => {
  const labels = ['Benign', 'Recon', 'Initial Access', 'Lateral', 'C2', 'Exfiltration'];

  return (
    <div className="w-full h-full min-h-[280px] bg-sentinel-surface/90 border border-sentinel-border rounded-xl p-3 shadow-xl flex flex-col font-mono">
      <div className="flex items-center justify-between border-b border-sentinel-border pb-2 mb-1 text-xs">
        <span className="text-sentinel-cyan font-bold uppercase">{modelName} Confusion Heatmap</span>
        <span className="text-[10px] text-gray-400">Normalized Test Set (N=2,000)</span>
      </div>

      <div className="flex-1 w-full">
        <SimpleHeatmap labels={labels} values={zValues} />
      </div>
    </div>
  );
};
