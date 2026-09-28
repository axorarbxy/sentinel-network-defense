import React from 'react';
import { Cpu, Database, Network, ShieldCheck, Zap } from 'lucide-react';

interface StatSpecCardProps {
  report?: any;
}

export const StatSpecCard: React.FC<StatSpecCardProps> = ({ report }) => {
  return (
    <div className="bg-sentinel-surface/90 border border-sentinel-border p-4 rounded-xl shadow-xl flex flex-col gap-3 font-mono">
      <div className="flex items-center justify-between border-b border-sentinel-border pb-2">
        <div className="flex items-center gap-2 text-sm font-bold text-sentinel-cyan uppercase">
          <Cpu className="w-4 h-4 text-sentinel-cyan" />
          Model Architecture & Training Spec Sheet
        </div>
        <span className="text-[11px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded">
          STATUS: VERIFIED PROTOTYPE
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="p-2.5 bg-sentinel-surface-card rounded border border-sentinel-border">
          <div className="flex items-center gap-1.5 text-gray-400 text-[10px] uppercase mb-1">
            <Database className="w-3 h-3 text-sentinel-cyan" />
            Training Corpus
          </div>
          <div className="text-gray-100 font-bold">{report?.training_corpus ?? "CIC-IDS-2018 + CTU-13"}</div>
          <div className="text-[10px] text-gray-500">8 normalized features / scenario-level evaluation</div>
        </div>

        <div className="p-2.5 bg-sentinel-surface-card rounded border border-sentinel-border">
          <div className="flex items-center gap-1.5 text-gray-400 text-[10px] uppercase mb-1">
            <Network className="w-3 h-3 text-purple-400" />
            Architecture
          </div>
          <div className="text-purple-300 font-bold">{report?.architecture ?? "LSTM + XGBoost Stage"}</div>
          <div className="text-[10px] text-gray-500">128 Hidden Units / 2 Layers</div>
        </div>

        <div className="p-2.5 bg-sentinel-surface-card rounded border border-sentinel-border">
          <div className="flex items-center gap-1.5 text-gray-400 text-[10px] uppercase mb-1">
            <Zap className="w-3 h-3 text-amber-400" />
            Forecast Horizon (K)
          </div>
          <div className="text-amber-300 font-bold">{report?.forecast_horizon ?? "K = 5 Windows (75s)"}</div>
          <div className="text-[10px] text-gray-500">Sliding Window: 15-sec step</div>
        </div>

        <div className="p-2.5 bg-sentinel-surface-card rounded border border-sentinel-border">
          <div className="flex items-center gap-1.5 text-gray-400 text-[10px] uppercase mb-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            SHAP Kernel
          </div>
          <div className="text-emerald-300 font-bold">TreeSHAP Real-time</div>
          <div className="text-[10px] text-gray-500">
            {report?.shap_kernel_latency_ms ? `Lat: ${report.shap_kernel_latency_ms}ms per flow` : 'Lat: <4.2ms per flow'}
          </div>
        </div>
      </div>
    </div>
  );
};

