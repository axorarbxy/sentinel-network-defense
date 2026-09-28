import React, { useState } from 'react';
import type { KillChainProbs, MitreStage } from '../types/sentinel';
import { ShapExplainabilityStrip } from './ShapExplainabilityStrip';
import { ShieldAlert, Radio, KeyRound, Network, Send } from 'lucide-react';

interface KillChainRailProps {
  probs: KillChainProbs;
}

interface StageMeta {
  key: Exclude<MitreStage, 'benign'>;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  color: string;
  glowColor: string;
}

const STAGES: StageMeta[] = [
  {
    key: 'recon',
    label: '1. Reconnaissance',
    shortLabel: 'RECON',
    icon: <Radio className="w-3.5 h-3.5" />,
    color: '#EAB308', // Amber
    glowColor: 'rgba(234, 179, 8, 0.4)',
  },
  {
    key: 'initial_access',
    label: '2. Initial Access',
    shortLabel: 'ACCESS',
    icon: <KeyRound className="w-3.5 h-3.5" />,
    color: '#F97316', // Orange
    glowColor: 'rgba(249, 115, 22, 0.4)',
  },
  {
    key: 'lateral_movement',
    label: '3. Lateral Movement',
    shortLabel: 'LATERAL',
    icon: <Network className="w-3.5 h-3.5" />,
    color: '#A855F7', // Purple
    glowColor: 'rgba(168, 85, 247, 0.4)',
  },
  {
    key: 'c2',
    label: '4. Command & Control',
    shortLabel: 'C2',
    icon: <ShieldAlert className="w-3.5 h-3.5" />,
    color: '#EF4444', // Red
    glowColor: 'rgba(239, 68, 68, 0.4)',
  },
  {
    key: 'exfiltration',
    label: '5. Exfiltration',
    shortLabel: 'EXFIL',
    icon: <Send className="w-3.5 h-3.5" />,
    color: '#DC2626', // Dark Red
    glowColor: 'rgba(220, 38, 38, 0.6)',
  },
];

export const KillChainRail: React.FC<KillChainRailProps> = ({ probs }) => {
  const [hoveredStage, setHoveredStage] = useState<MitreStage | null>(null);

  // Find max probability stage to highlight as active
  const stageEntries = Object.entries(probs) as [Exclude<MitreStage, 'benign'>, number][];
  let maxStage: Exclude<MitreStage, 'benign'> = 'recon';
  let maxVal = -1;
  stageEntries.forEach(([stg, val]) => {
    if (val > maxVal) {
      maxVal = val;
      maxStage = stg;
    }
  });

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-wider text-gray-300 uppercase">
          <span className="w-2 h-2 rounded-full bg-sentinel-cyan animate-pulse"></span>
          MITRE ATT&CK Kill-Chain Probability Rail
        </div>
        <span className="text-[11px] font-mono text-sentinel-cyan">
          Active Stage Forecast: <strong className="uppercase underline font-bold">{maxStage.replace('_', ' ')}</strong> ({Math.round(maxVal * 100)}%)
        </span>
      </div>

      {/* Horizontal 5-segment rail */}
      <div className="grid grid-cols-5 gap-2 w-full">
        {STAGES.map((stage) => {
          const prob = probs[stage.key] || 0.0;
          const probPercent = Math.round(prob * 100);
          const isActiveStage = stage.key === maxStage;
          const isHovered = hoveredStage === stage.key;

          return (
            <div
              key={stage.key}
              onMouseEnter={() => setHoveredStage(stage.key)}
              onMouseLeave={() => setHoveredStage(null)}
              className={`relative flex flex-col justify-between p-2.5 rounded-lg border transition-all duration-300 ${
                isActiveStage
                  ? 'bg-sentinel-surface-card border-sentinel-border-bright shadow-lg'
                  : 'bg-sentinel-surface/60 border-sentinel-border opacity-85 hover:opacity-100 hover:border-gray-600'
              }`}
              style={{
                borderColor: isActiveStage ? stage.color : undefined,
                boxShadow: isActiveStage ? `0 0 16px ${stage.glowColor}` : undefined,
              }}
            >
              {/* Header: Stage Icon & Label */}
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-1.5 font-mono font-medium truncate" style={{ color: isActiveStage ? stage.color : '#94A3B8' }}>
                  {stage.icon}
                  <span className="truncate">{stage.shortLabel}</span>
                </div>
                <span className="font-mono font-bold text-xs" style={{ color: isActiveStage ? '#FFF' : '#CBD5E1' }}>
                  {probPercent}%
                </span>
              </div>

              {/* Progress bar background & fill */}
              <div className="w-full bg-black/50 h-2 rounded-full overflow-hidden relative border border-white/5">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${probPercent}%`,
                    backgroundColor: stage.color,
                    boxShadow: `0 0 8px ${stage.glowColor}`,
                  }}
                />
              </div>

              {/* Tooltip on hover surfacing top SHAP features */}
              {isHovered && (
                <div className="absolute bottom-full left-0 mb-2 w-64 z-30 p-2.5 rounded-lg glass-panel-accent shadow-2xl">
                  <ShapExplainabilityStrip
                    title={`Stage ${stage.shortLabel} Driver`}
                    compact
                    features={[
                      {
                        feature: `${stage.key}_pattern_score`,
                        value: prob,
                        contribution: prob > 0.5 ? 0.34 : -0.12,
                        description: `Neural activation for stage ${stage.label}`,
                      },
                      {
                        feature: 'port_entropy',
                        value: 3.42,
                        contribution: 0.21,
                        description: 'Multi-port probing behavior detected.',
                      },
                    ]}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
