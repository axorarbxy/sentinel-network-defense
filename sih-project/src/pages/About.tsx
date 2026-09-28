import React from 'react';
import { ModeSwitch } from '../components/ModeSwitch';
import { Shield, Network, ArrowRight, Layers, Lock, Zap, FileCode2 } from 'lucide-react';

export const About: React.FC = () => {
  return (
    <div className="min-h-screen w-screen bg-sentinel-bg text-gray-100 font-sans overflow-y-auto">
      {/* Top Header */}
      <header className="h-14 px-6 bg-sentinel-surface/90 border-b border-sentinel-border flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sentinel-cyan/20 border border-sentinel-cyan/40 flex items-center justify-center">
            <Shield className="w-4 h-4 text-sentinel-cyan" />
          </div>
          <div>
            <h1 className="text-sm font-mono font-extrabold tracking-widest text-white">
              SENTINEL ARCHITECTURE <span className="text-sentinel-cyan font-normal">SIH26153</span>
            </h1>
            <span className="text-[10px] text-gray-400 font-mono">
              Predictive World-Model Cyber Attack Forecasting Specification
            </span>
          </div>
        </div>

        <ModeSwitch />
      </header>

      {/* Main One-Pager Content */}
      <main className="p-6 max-w-5xl mx-auto space-y-10 py-10">
        {/* Hero Concept Section */}
        <section className="bg-gradient-to-r from-sentinel-surface to-sentinel-surface-card border border-sentinel-border p-8 rounded-2xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Network className="w-64 h-64 text-sentinel-cyan" />
          </div>

          <div className="relative z-10 space-y-4 max-w-3xl">
            <span className="text-xs font-mono text-sentinel-cyan font-bold uppercase tracking-widest px-3 py-1 bg-sentinel-cyan/10 border border-sentinel-cyan/30 rounded-full inline-block">
              Core Paradigm: The World-Model Cockpit
            </span>

            <h2 className="text-2xl md:text-3xl font-mono font-extrabold text-white leading-tight">
              Predicting Attack Evolution Before Completion via P(S<sub>t+1</sub> | S<sub>t</sub>)
            </h2>

            <p className="text-sm text-gray-300 font-sans leading-relaxed">
              Standard intrusion detection systems (IDS) are <em>classifier UIs</em> — they act after packets pass, flagging static alerts. <strong>SENTINEL</strong> models the entire network as a stateful, evolving digital twin. By formulating attack progression as Markovian state transitions P(S<sub>t+1</sub> | S<sub>t</sub>), SENTINEL rolls the network simulation forward in time to predict multi-stage MITRE ATT&amp;CK trajectories up to 75 seconds before exfiltration completes.
            </p>
          </div>
        </section>

        {/* Pipeline Visual Diagram */}
        <section className="space-y-4 font-mono">
          <h3 className="text-sm font-bold uppercase text-sentinel-cyan tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-sentinel-cyan" />
            End-to-End Predictive Telemetry Pipeline
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
            <div className="p-3 bg-sentinel-surface rounded-xl border border-sentinel-border flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-gray-500 uppercase block font-bold mb-1">01. Ingestion</span>
                <h4 className="font-bold text-white">WinPCAP / Scapy</h4>
                <p className="text-[11px] text-gray-400 font-sans mt-1">Raw NIC packet capture &amp; flow aggregation.</p>
              </div>
              <ArrowRight className="w-4 h-4 text-sentinel-cyan mt-3 self-end" />
            </div>

            <div className="p-3 bg-sentinel-surface rounded-xl border border-sentinel-border flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-gray-500 uppercase block font-bold mb-1">02. Features</span>
                <h4 className="font-bold text-white">80-Dim Vector</h4>
                <p className="text-[11px] text-gray-400 font-sans mt-1">IAT variance, port entropy, payload ratios.</p>
              </div>
              <ArrowRight className="w-4 h-4 text-sentinel-cyan mt-3 self-end" />
            </div>

            <div className="p-3 bg-sentinel-surface rounded-xl border border-sentinel-border flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-gray-500 uppercase block font-bold mb-1">03. Inference</span>
                <h4 className="font-bold text-purple-300">Bi-LSTM + XGBoost</h4>
                <p className="text-[11px] text-gray-400 font-sans mt-1">Stage classifier + K-step forecaster.</p>
              </div>
              <ArrowRight className="w-4 h-4 text-purple-400 mt-3 self-end" />
            </div>

            <div className="p-3 bg-sentinel-surface rounded-xl border border-sentinel-border flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-gray-500 uppercase block font-bold mb-1">04. Explainability</span>
                <h4 className="font-bold text-amber-300">TreeSHAP Kernel</h4>
                <p className="text-[11px] text-gray-400 font-sans mt-1">Signed feature attributions per flow.</p>
              </div>
              <ArrowRight className="w-4 h-4 text-amber-400 mt-3 self-end" />
            </div>

            <div className="p-3 bg-sentinel-surface-card rounded-xl border border-sentinel-border-bright flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-sentinel-cyan uppercase block font-bold mb-1">05. Cockpit</span>
                <h4 className="font-bold text-sentinel-cyan">FastAPI + React UI</h4>
                <p className="text-[11px] text-gray-400 font-sans mt-1">Real-time WebSocket &amp; Digital Twin.</p>
              </div>
              <Zap className="w-4 h-4 text-sentinel-cyan mt-3 self-end" />
            </div>
          </div>
        </section>

        {/* Problem Statement & Team Metadata */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
          <div className="bg-sentinel-surface/90 border border-sentinel-border p-5 rounded-xl space-y-2">
            <h4 className="font-bold text-white text-sm border-b border-sentinel-border pb-2 flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-sentinel-cyan" />
              Problem Statement SIH26153
            </h4>
            <p className="text-gray-300 font-sans text-xs leading-relaxed">
              <strong>Title:</strong> AI-based Network Attack Forecasting from Network Traffic Data<br />
              <strong>Objective:</strong> Design and build a real-time forecasting solution that models network state progression to predict future attack stages rather than mere reactive alerts.
            </p>
          </div>

          <div className="bg-sentinel-surface/90 border border-sentinel-border p-5 rounded-xl space-y-2">
            <h4 className="font-bold text-white text-sm border-b border-sentinel-border pb-2 flex items-center gap-2">
              <Lock className="w-4 h-4 text-purple-400" />
              Security &amp; Performance Guarantees
            </h4>
            <ul className="text-gray-300 font-sans text-xs space-y-1.5 list-disc list-inside">
              <li>Zero-copy WebGL 2D force graph canvas rendering at 60 FPS</li>
              <li>Sub-5ms inference latency per incoming packet flow</li>
              <li>Air-gapped standalone simulator mode for competition resilience</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
};
