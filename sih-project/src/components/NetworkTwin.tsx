import React, { useRef, useEffect, useState, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import type { ForceGraphMethods } from 'react-force-graph-2d';
import type { HostNode, FlowEdge } from '../types/sentinel';
import { useSentinelStore } from '../store/useSentinelStore';
import { Shield, Layers, ChevronDown, ChevronUp } from 'lucide-react';
import * as d3 from 'd3-force';

interface NetworkTwinProps {
  nodes: HostNode[];
  edges: FlowEdge[];
  isForecastMode?: boolean;
  wheelScrollsPage?: boolean;
}

export const NetworkTwin: React.FC<NetworkTwinProps> = ({
  nodes,
  edges,
  isForecastMode = false,
  wheelScrollsPage = false,
}) => {
  const fgRef = useRef<ForceGraphMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [showLegend, setShowLegend] = useState(true);

  const { selectedNodeId, setSelectedNodeId, setSelectedEdgeId } = useSentinelStore();

  // Resize canvas when panel changes size
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Configure D3 forces for deterministic node separation (No Collisions!)
  useEffect(() => {
    if (fgRef.current) {
      // Strong repulsion to keep nodes separated
      fgRef.current.d3Force('charge', d3.forceManyBody().strength(-1200));
      // Strict collision buffer radius (45px) so host halos and text labels NEVER overlap
      fgRef.current.d3Force('collide', d3.forceCollide(45).strength(1.0));
      // Link distance to prevent collapsing inward
      fgRef.current.d3Force('link', d3.forceLink().distance(160));
      // Re-heat simulation slightly when nodes update
      fgRef.current.d3ReheatSimulation();
    }
  }, [nodes, edges]);

  // Format graph data for react-force-graph
  const graphData = React.useMemo(() => {
    return {
      nodes: nodes.map((n) => ({ ...n })),
      links: edges.map((e) => ({
        ...e,
        source: e.src,
        target: e.dst,
      })),
    };
  }, [nodes, edges]);

  // Color helper based on risk score
  const getNodeColor = useCallback((risk: number, isGhost?: boolean) => {
    if (isGhost) return 'rgba(245, 158, 11, 0.8)';
    if (risk >= 0.8) return '#EF4444'; // Red
    if (risk >= 0.5) return '#F97316'; // Orange
    if (risk >= 0.3) return '#EAB308'; // Amber
    return '#3DFDC6'; // Cyan / Teal
  }, []);

  // Canvas Node Paint Callback (Custom Glowing Halos & Roles with Collision Protection)
  const drawNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const risk = node.riskScore ?? 0.1;
      const isSelected = selectedNodeId === node.id;
      const isGhost = node.isGhost || isForecastMode;

      // Base radius scaled by flow volume
      const baseRadius = Math.max(9, Math.min(20, 8 + Math.sqrt((node.bytesSent || 0) + (node.bytesReceived || 0)) / 450));
      const color = getNodeColor(risk, isGhost);

      // Clamp Y coordinate to prevent drifting below canvas into bottom band
      const maxY = (dimensions.height / 2) - 40;
      const minY = -(dimensions.height / 2) + 40;
      node.y = Math.max(minY, Math.min(maxY, node.y || 0));

      // 1. Soft Glowing Halo for High-Risk Hosts
      if (risk > 0.4 || isSelected) {
        const glowRadius = baseRadius + (isSelected ? 12 : Math.max(5, risk * 14));
        ctx.beginPath();
        ctx.arc(node.x, node.y, glowRadius, 0, 2 * Math.PI, false);
        ctx.fillStyle = isSelected ? 'rgba(61, 253, 198, 0.35)' : risk > 0.7 ? 'rgba(239, 68, 68, 0.35)' : 'rgba(249, 115, 22, 0.3)';
        ctx.fill();
      }

      // 2. Node Circle Fill
      ctx.beginPath();
      ctx.arc(node.x, node.y, baseRadius, 0, 2 * Math.PI, false);
      ctx.fillStyle = isGhost ? 'rgba(26, 31, 43, 0.95)' : '#12161F';
      ctx.fill();

      // 3. Node Border Ring (Dashed if Ghost Forecast mode)
      ctx.lineWidth = isSelected ? 3.5 : 2.5;
      ctx.strokeStyle = color;
      if (isGhost) {
        ctx.setLineDash([4, 4]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.stroke();
      ctx.setLineDash([]); // Reset line dash

      // 4. Inner Icon / Role Marker
      ctx.beginPath();
      ctx.arc(node.x, node.y, baseRadius * 0.45, 0, 2 * Math.PI, false);
      ctx.fillStyle = color;
      ctx.fill();

      // 5. Crisp Monospace Node Text Label (IP Address & Role with background pill for 100% legibility)
      const label = node.label || node.id;
      const fontSize = Math.max(10, Math.min(13, 12 / globalScale));
      ctx.font = `${isSelected ? 'bold' : 'normal'} ${fontSize}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      const labelY = node.y + baseRadius + 6;
      const textWidth = ctx.measureText(label).width;

      // Draw subtle background pill under label so text never collides with background grid or links
      ctx.fillStyle = 'rgba(10, 14, 20, 0.85)';
      ctx.fillRect(node.x - textWidth / 2 - 4, labelY - 2, textWidth + 8, fontSize + 4);

      ctx.fillStyle = isGhost ? '#FBBF24' : isSelected ? '#3DFDC6' : '#E2E8F0';
      ctx.fillText(label, node.x, labelY);
    },
    [getNodeColor, selectedNodeId, isForecastMode, dimensions.height]
  );

  // Link Canvas Paint (Dashed predicted edges & packet particle speed)
  const getLinkColor = useCallback((link: any) => {
    if (link.isGhost || isForecastMode) return 'rgba(245, 158, 11, 0.5)';
    if (link.riskScore >= 0.8) return 'rgba(239, 68, 68, 0.8)';
    if (link.riskScore >= 0.5) return 'rgba(249, 115, 22, 0.7)';
    return 'rgba(61, 253, 198, 0.4)';
  }, [isForecastMode]);

  return (
    <div
      ref={containerRef}
      onWheelCapture={(event) => {
        if (wheelScrollsPage && !event.ctrlKey) event.stopPropagation();
      }}
      className="relative w-full h-full bg-sentinel-bg hud-grid-bg overflow-hidden"
    >
      {/* Forecast Ghost Overlay Indicator */}
      {isForecastMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-1.5 bg-amber-500/20 border border-amber-500/60 rounded-full text-amber-300 font-mono text-xs shadow-[0_0_20px_rgba(245,158,11,0.3)] animate-pulse">
          <Layers className="w-4 h-4 text-amber-400" />
          SIMULATION GHOST RENDER (K-STEP FORECAST HORIZON)
        </div>
      )}

      {/* Force Graph 2D WebGL/Canvas Renderer */}
      <ForceGraph2D
        ref={fgRef as any}
        width={dimensions.width}
        height={dimensions.height}
        graphData={graphData}
        nodeId="id"
        nodeCanvasObject={drawNode}
        nodePointerAreaPaint={(node: any, color, ctx) => {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(node.x, node.y, 20, 0, 2 * Math.PI, false);
          ctx.fill();
        }}
        linkColor={getLinkColor}
        linkWidth={(link: any) => Math.max(1.5, Math.min(6, Math.sqrt(link.bytes || 1000) / 140))}
        linkDirectionalParticles={(link: any) => (link.riskScore > 0.4 ? 4 : 2)}
        linkDirectionalParticleSpeed={(link: any) => (link.riskScore > 0.7 ? 0.008 : 0.004)}
        linkDirectionalParticleWidth={(link: any) => (link.riskScore > 0.7 ? 3.5 : 2)}
        linkDirectionalParticleColor={(link: any) => (link.riskScore > 0.7 ? '#EF4444' : '#3DFDC6')}
        onNodeClick={(node: any) => {
          setSelectedNodeId(node.id);
        }}
        onLinkClick={(link: any) => {
          setSelectedEdgeId(link.id);
        }}
        cooldownTicks={120}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
      />

      {/* Collapsible Graph Legend */}
      <div className="absolute bottom-4 left-4 z-20 bg-sentinel-surface/90 border border-sentinel-border rounded-lg text-xs font-mono backdrop-blur-md shadow-xl max-w-xs">
        <button
          onClick={() => setShowLegend(!showLegend)}
          className="flex items-center justify-between w-full px-3 py-2 text-gray-300 font-bold uppercase tracking-wider border-b border-sentinel-border/50 hover:bg-sentinel-surface-light rounded-t-lg"
        >
          <span className="flex items-center gap-1.5 text-sentinel-cyan">
            <Shield className="w-3.5 h-3.5" />
            Digital Twin Legend
          </span>
          {showLegend ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>

        {showLegend && (
          <div className="p-3 space-y-2 text-[11px] text-gray-300">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
                Critical Risk Host
              </span>
              <span className="text-red-400 font-bold">&gt;80%</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                Elevated Risk Host
              </span>
              <span className="text-orange-400 font-bold">50-80%</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sentinel-cyan"></span>
                Nominal Host
              </span>
              <span className="text-sentinel-cyan font-bold">&lt;30%</span>
            </div>

            <div className="border-t border-sentinel-border pt-1.5 space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-4 h-0.5 bg-amber-400 border border-dashed"></span>
                <span className="text-amber-300">Ghost / Forecast State</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sentinel-cyan animate-ping"></span>
                <span className="text-gray-400">Particles = Directed Packets</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
