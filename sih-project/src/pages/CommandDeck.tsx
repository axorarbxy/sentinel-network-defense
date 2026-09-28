import React, { useEffect } from 'react';
import { useSentinelStore } from '../store/useSentinelStore';
import { NetworkTwin } from '../components/NetworkTwin';
import { KillChainRail } from '../components/KillChainRail';
import { TimelineScrubber } from '../components/TimelineScrubber';
import { ThreatTickerFeed } from '../components/ThreatTickerFeed';
import { RadialRiskGauge } from '../components/RadialRiskGauge';
import { ConnectionStatusPill } from '../components/ConnectionStatusPill';
import { ModeSwitch } from '../components/ModeSwitch';
import { NodeDeepDivePanel } from '../components/NodeDeepDivePanel';
import { EdgeDetailPopover } from '../components/EdgeDetailPopover';
import { Shield, Radio } from 'lucide-react';

export const CommandDeck: React.FC = () => {
  const { stateUpdate, isForecastMode, tickLiveSimulation, isMockMode } = useSentinelStore();

  // Tick simulation every 2.5s if in mock mode
  useEffect(() => {
    if (isMockMode) {
      const interval = setInterval(() => {
        tickLiveSimulation();
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [isMockMode, tickLiveSimulation]);

  return (
    <div className="flex flex-col h-screen w-screen bg-sentinel-bg text-gray-100 overflow-hidden font-sans select-none">
      {/* Top Bar HUD */}
      <header className="h-14 px-4 bg-sentinel-surface/90 border-b border-sentinel-border flex items-center justify-between z-30 shrink-0 backdrop-blur-md">
        {/* Brand & Ingest Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sentinel-cyan/15 border border-sentinel-cyan/40 flex items-center justify-center shadow-[0_0_12px_rgba(61,253,198,0.3)]">
              <Shield className="w-4 h-4 text-sentinel-cyan" />
            </div>
            <div>
              <h1 className="text-sm font-mono font-extrabold tracking-widest text-white flex items-center gap-1.5">
                SENTINEL <span className="text-[10px] text-sentinel-cyan font-normal uppercase">v2.4 HUD</span>
              </h1>
              <span className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
                <Radio className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
                Ingest: Live WinPCAP / Scapy Flow Engine
              </span>
            </div>
          </div>

          <div className="w-[1px] h-6 bg-sentinel-border mx-1" />

          {/* Connection Status Pill */}
          <ConnectionStatusPill />
        </div>

        {/* Center Mode Switch */}
        <ModeSwitch />

        {/* Right Radial Threat Gauge */}
        <RadialRiskGauge score={stateUpdate.globalRisk} />
      </header>

      {/* Main 3-Zone Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Center Zone (60% width): The Twin Graph Centerpiece */}
        <main className="flex-1 relative h-full">
          <NetworkTwin
            nodes={stateUpdate.nodes}
            edges={stateUpdate.edges}
            isForecastMode={isForecastMode}
          />
        </main>

        {/* Right Rail (~340px): Threat Ticker Feed */}
        <aside className="w-80 h-full shrink-0 border-l border-sentinel-border p-2 bg-sentinel-bg/80 backdrop-blur-sm z-20">
          <ThreatTickerFeed />
        </aside>

        {/* Node Deep-Dive Drawer (Slide-in) */}
        <NodeDeepDivePanel />

        {/* Edge Detail Popover */}
        <EdgeDetailPopover />
      </div>

      {/* Bottom Band (~190px): Kill-Chain Rail + Timeline Scrubber */}
      <footer className="h-48 px-4 py-2 bg-sentinel-surface/95 border-t border-sentinel-border flex flex-col justify-between z-30 shrink-0 shadow-2xl">
        <KillChainRail probs={stateUpdate.killChainProbs} />
        <TimelineScrubber />
      </footer>
    </div>
  );
};
