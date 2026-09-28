import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { wsClient } from '../services/websocket';
import { useSentinelStore } from '../store/useSentinelStore';
import { Activity, PlaySquare, BarChart3, Info, LogOut, UploadCloud } from 'lucide-react';

export const ModeSwitch: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setMode, logout, user } = useSentinelStore();

  const currentPath = location.pathname;

  const handleNav = (path: string, mode?: 'live' | 'replay') => {
    if (path === '/replay') {
      wsClient.disconnect();
    }
    if (mode) {
      setMode(mode);
    }
    navigate(path);
  };

  const handleLogout = () => {
    wsClient.disconnect();
    logout();
    navigate('/login');
  };

  return (
    <div className="flex items-center bg-sentinel-surface p-1 rounded-lg border border-sentinel-border gap-1">
      <button
        onClick={() => handleNav('/', 'live')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all ${
          currentPath === '/'
            ? 'bg-sentinel-cyan/15 text-sentinel-cyan border border-sentinel-cyan/40 shadow-[0_0_10px_rgba(61,253,198,0.2)]'
            : 'text-gray-400 hover:text-gray-200 hover:bg-sentinel-surface-light'
        }`}
      >
        <Activity className="w-3.5 h-3.5" />
        <span>Live Monitor</span>
      </button>

      <button
        onClick={() => handleNav('/replay', 'replay')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all ${
          currentPath === '/replay'
            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
            : 'text-gray-400 hover:text-gray-200 hover:bg-sentinel-surface-light'
        }`}
      >
        <PlaySquare className="w-3.5 h-3.5" />
        <span>Incident Replay</span>
      </button>

      <button
        onClick={() => handleNav('/analyze')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all ${
          currentPath === '/analyze'
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
            : 'text-gray-400 hover:text-gray-200 hover:bg-sentinel-surface-light'
        }`}
        title="Upload Ad-Hoc PCAP/CSV Capture File"
      >
        <UploadCloud className="w-3.5 h-3.5" />
        <span>Analyze Traffic</span>
      </button>

      <div className="w-[1px] h-4 bg-sentinel-border mx-1"></div>

      <button
        onClick={() => handleNav('/benchmarks')}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-mono font-medium transition-all ${
          currentPath === '/benchmarks'
            ? 'bg-blue-500/20 text-sentinel-blue border border-blue-500/40'
            : 'text-gray-400 hover:text-gray-200 hover:bg-sentinel-surface-light'
        }`}
        title="Model Report Card & Benchmarks"
      >
        <BarChart3 className="w-3.5 h-3.5" />
        <span>Benchmarks</span>
      </button>

      <button
        onClick={() => handleNav('/about')}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-mono font-medium transition-all ${
          currentPath === '/about'
            ? 'bg-gray-700/40 text-white border border-gray-500/40'
            : 'text-gray-400 hover:text-gray-200 hover:bg-sentinel-surface-light'
        }`}
        title="Architecture & Concept Overview"
      >
        <Info className="w-3.5 h-3.5" />
        <span>About</span>
      </button>

      <div className="w-[1px] h-4 bg-sentinel-border mx-1"></div>

      <button
        onClick={handleLogout}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-mono text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-all"
        title={`Logged in as ${user?.email || 'SOC Analyst'} - Click to Sign Out`}
      >
        <LogOut className="w-3.5 h-3.5" />
        <span>Logout</span>
      </button>
    </div>
  );
};

