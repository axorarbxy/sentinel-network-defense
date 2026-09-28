import React from 'react';
import { useSentinelStore } from '../store/useSentinelStore';
import { wsClient } from '../services/websocket';
import { Wifi, Cpu, RefreshCw } from 'lucide-react';

export const ConnectionStatusPill: React.FC = () => {
  const { wsStatus, isMockMode, setMockMode } = useSentinelStore();

  const getStatusDisplay = () => {
    if (isMockMode) {
      return {
        label: 'STANDALONE SIMULATOR',
        color: 'bg-sentinel-cyan/20 border-sentinel-cyan/40 text-sentinel-cyan',
        dot: 'bg-sentinel-cyan animate-pulse',
        icon: <Cpu className="w-3 h-3 text-sentinel-cyan" />,
      };
    }
    if (wsStatus === 'connected') {
      return {
        label: 'WS LIVE: FASTAPI',
        color: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400',
        dot: 'bg-emerald-400 animate-ping',
        icon: <Wifi className="w-3 h-3 text-emerald-400" />,
      };
    }
    return {
      label: 'RECONNECTING...',
      color: 'bg-amber-500/20 border-amber-500/40 text-amber-400',
      dot: 'bg-amber-400 animate-spin',
      icon: <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />,
    };
  };

  const status = getStatusDisplay();

  const handleToggleMode = () => {
    const nextIsMock = !isMockMode;
    setMockMode(nextIsMock);

    if (nextIsMock) {
      wsClient.disconnect();
      return;
    }

    wsClient.connect();
  };

  React.useEffect(() => {
    if (isMockMode) return;
    wsClient.connect();
    return () => wsClient.disconnect();
  }, [isMockMode]);

  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex items-center gap-2 px-2.5 py-1 rounded-md border text-[11px] font-mono font-medium ${status.color}`}
        title="WebSocket Telemetry Pipeline Status"
      >
        {status.icon}
        <span className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`}></span>
          {status.label}
        </span>
      </div>

      <button
        onClick={handleToggleMode}
        className="px-2 py-1 text-[10px] font-mono bg-sentinel-surface-light hover:bg-sentinel-border text-gray-300 hover:text-white rounded border border-sentinel-border transition-colors"
        title="Toggle between real FastAPI WebSocket feed and built-in Mock Simulator"
      >
        {isMockMode ? 'Switch to WS' : 'Switch to Mock'}
      </button>
    </div>
  );
};
