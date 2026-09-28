import React from 'react';
import { useSentinelStore } from '../store/useSentinelStore';
import { API_BASE_URL } from '../config/endpoints';
import { ModeSwitch } from '../components/ModeSwitch';
import { StatSpecCard } from '../components/StatSpecCard';
import { BenchmarkComparisonChart } from '../components/BenchmarkComparisonChart';
import { ConfusionMatrixHeatmap } from '../components/ConfusionMatrixHeatmap';
import { BarChart3, Award } from 'lucide-react';

export const Benchmarks: React.FC = () => {
  const [report, setReport] = React.useState<any>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  const authToken = useSentinelStore((state) => state.authToken);

  React.useEffect(() => {
    let isMounted = true;

    const fetchBenchmarks = async () => {
      const token = authToken || 'sentinel-proto-token-2026';

      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE_URL}/api/benchmarks`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ detail: 'Unable to load benchmark results.' }));
          throw new Error(errorData.detail || 'Unable to load benchmark results.');
        }

        const data = await res.json();
        if (isMounted) {
          setReport(data);
        }
      } catch (err) {
        console.log('Benchmarks fetch notice:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unable to load benchmark results.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchBenchmarks();

    return () => {
      isMounted = false;
    };
  }, [authToken]);

  const macroF1 = report?.macro_f1 ?? 72.9;
  const fpr = report?.fpr ?? 25.92;
  const leadTime = report?.mean_forecast_lead_time_seconds ?? 31.8;
  const baselineMacroF1 = report?.per_stage?.length
    ? report.per_stage.reduce((sum: number, stage: any) => sum + Number(stage.baseline_f1 || 0), 0) / report.per_stage.length
    : null;
  const f1Delta = baselineMacroF1 === null ? null : Number(macroF1) - baselineMacroF1;

  const worldMatrix = report?.world_model_confusion ?? [
    [263, 22, 8, 14, 23, 25],
    [69, 212, 22, 21, 19, 17],
    [0, 68, 175, 27, 5, 0],
    [2, 0, 20, 210, 35, 0],
    [5, 0, 0, 9, 235, 18],
    [6, 0, 0, 0, 46, 214],
  ];

  const baseMatrix = report?.baseline_confusion ?? [
    [351, 6, 1, 6, 0, 0],
    [27, 255, 60, 17, 2, 0],
    [4, 82, 140, 40, 9, 0],
    [9, 4, 15, 195, 40, 4],
    [0, 0, 5, 51, 140, 71],
    [0, 0, 1, 8, 49, 208],
  ];

  const perStage = report?.per_stage ?? [
    { stage: "Reconnaissance", model_f1: 64.0, baseline_f1: 72.0 },
    { stage: "Initial Access", model_f1: 70.0, baseline_f1: 56.3 },
    { stage: "Lateral Movement", model_f1: 76.6, baseline_f1: 66.8 },
    { stage: "Command & Control", model_f1: 74.6, baseline_f1: 55.2 },
    { stage: "Exfiltration", model_f1: 79.3, baseline_f1: 75.8 },
  ];

  return (
    <div className="min-h-screen w-screen bg-sentinel-bg text-gray-100 font-sans overflow-y-auto">
      {/* Top Header */}
      <header className="h-14 px-6 bg-sentinel-surface/90 border-b border-sentinel-border flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-sentinel-blue" />
          </div>
          <div>
            <h1 className="text-sm font-mono font-extrabold tracking-widest text-white">
              MODEL REPORT CARD <span className="text-sentinel-blue font-normal">SIH26153 BENCHMARKS</span>
            </h1>
            <span className="text-[10px] text-gray-400 font-mono">
              Empirical Performance Validation vs. Baseline Classifiers {loading && '(Refreshing...)'}
            </span>
            {error && <span className="text-[10px] text-amber-400 font-mono">Showing fallback data: {error}</span>}
          </div>
        </div>

        <ModeSwitch />
      </header>

      {/* Main Container */}
      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Top Spec Card */}
        <StatSpecCard report={report} />


        {/* F1 / Metrics Comparison Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 min-h-[360px]">
            <BenchmarkComparisonChart mode="grouped_bars" stages={perStage.map((s: any) => s.stage)} worldF1={perStage.map((s: any) => s.model_f1)} baseF1={perStage.map((s: any) => s.baseline_f1)} />
          </div>

          {/* Key Metric KPI Highlights */}
          <div className="bg-sentinel-surface/90 border border-sentinel-border p-4 rounded-xl shadow-xl flex flex-col justify-between font-mono space-y-3">
            <h3 className="text-xs font-bold text-sentinel-cyan uppercase border-b border-sentinel-border pb-2 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              Empirical Evaluation Summary
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-2.5 bg-sentinel-surface-card rounded border border-sentinel-border">
                <span className="text-gray-400 text-[10px] uppercase block">Macro F1 Score</span>
                <span className="text-xl font-bold text-sentinel-cyan">{macroF1}%</span>
                <span className={`text-[10px] block ${f1Delta !== null && f1Delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {f1Delta === null
                    ? 'Compared with Logistic Baseline'
                    : `${f1Delta >= 0 ? '+' : ''}${f1Delta.toFixed(1)}% vs Logistic Baseline`}
                </span>
              </div>

              <div className="p-2.5 bg-sentinel-surface-card rounded border border-sentinel-border">
                <span className="text-gray-400 text-[10px] uppercase block">False Positive Rate (FPR)</span>
                <span className="text-xl font-bold text-emerald-400">{fpr}%</span>
                <span className="text-[10px] text-gray-400 block">Tested on held-out CTU-13</span>
              </div>

              <div className="p-2.5 bg-sentinel-surface-card rounded border border-sentinel-border">
                <span className="text-gray-400 text-[10px] uppercase block">Mean Forecast Lead Time</span>
                <span className="text-xl font-bold text-purple-400">{leadTime} sec</span>
                <span className="text-[10px] text-gray-400 block">Lead time prior to exfiltration</span>
              </div>
            </div>
          </div>
        </div>

        {/* Confusion Heatmaps Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ConfusionMatrixHeatmap
            modelName="SENTINEL Predictive World-Model"
            zValues={worldMatrix}
          />

          <ConfusionMatrixHeatmap
            modelName="Logistic Regression Baseline"
            zValues={baseMatrix}
          />
        </div>
      </main>
    </div>
  );
};
