import React, { useEffect, useRef, useState } from 'react';
import { useSentinelStore } from '../store/useSentinelStore';
import { SentinelReplayWebSocketClient } from '../services/websocket';
import { API_BASE_URL } from '../config/endpoints';
import type { GroundTruthWindow, IncidentScenario } from '../types/sentinel';
import { NetworkTwin } from '../components/NetworkTwin';
import { KillChainRail } from '../components/KillChainRail';
import { TimelineScrubber } from '../components/TimelineScrubber';
import { BenchmarkComparisonChart } from '../components/BenchmarkComparisonChart';
import { ModeSwitch } from '../components/ModeSwitch';
import { Play, Pause, RotateCcw, CheckCircle2, Film } from 'lucide-react';

export const IncidentReplay: React.FC = () => {
  const {
    activeScenario,
    setActiveScenario,
    replayPlayback,
    toggleReplayPlay,
    setPlaybackSpeed,
    stepReplay,
    resetReplay,
    stateUpdate,
    isForecastMode,
    isMockMode,
    setStateUpdate,
    setReplayTime,
    replayProbabilityTimeline,
    setReplayProbabilityTimeline,
  } = useSentinelStore();
  const [scenarios, setScenarios] = useState<IncidentScenario[]>([activeScenario]);
  const [scenarioError, setScenarioError] = useState<string | null>(null);
  const replayClientRef = useRef<SentinelReplayWebSocketClient | null>(null);

  const { isPlaying, currentTimeSec, playbackSpeed, isDebriefState, accuracyRating } = replayPlayback;

  useEffect(() => {
    const token = useSentinelStore.getState().authToken || 'sentinel-proto-token-2026';
    fetch(`${API_BASE_URL}/api/scenarios`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load replay scenarios.');
        return response.json();
      })
      .then((data: IncidentScenario[]) => {
        setScenarios(data);
        const selected = data.find((scenario) => scenario.id === activeScenario.id) || data[0];
        if (selected) setActiveScenario(selected);
      })
      .catch((error: Error) => setScenarioError(error.message));
  }, [activeScenario.id, setActiveScenario]);

  useEffect(() => {
    const token = useSentinelStore.getState().authToken || 'sentinel-proto-token-2026';
    fetch(`${API_BASE_URL}/api/scenarios/${activeScenario.id}/ground_truth`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load replay ground truth.');
        return response.json();
      })
      .then((groundTruthWindows: GroundTruthWindow[]) => {
        setActiveScenario({ ...useSentinelStore.getState().activeScenario, groundTruthWindows });
      })
      .catch((error: Error) => setScenarioError(error.message));
  }, [activeScenario.id, setActiveScenario]);

  // Playback timer loop
  useEffect(() => {
    if (!isMockMode) return;

    let timer: ReturnType<typeof setInterval>;
    if (isPlaying) {
      timer = setInterval(() => {
        stepReplay(1 * playbackSpeed);
      }, 1000 / playbackSpeed);
    }
    return () => clearInterval(timer);
  }, [isMockMode, isPlaying, playbackSpeed, stepReplay]);

  useEffect(() => {
    if (isMockMode) return;

    const replayClient = new SentinelReplayWebSocketClient();
    replayClientRef.current = replayClient;
    replayClient.connect(activeScenario.id, (frame) => {
      const replayState = useSentinelStore.getState().replayPlayback;
      if (replayState.isPlaying || replayState.currentTimeSec === 0) {
        setStateUpdate(frame.stateUpdate);
        setReplayTime(frame.currentTimeSec);
      }
      if (frame.probabilityPoint) {
        const timeline = useSentinelStore.getState().replayProbabilityTimeline;
        if (!timeline.some((point) => point.timeSec === frame.probabilityPoint?.timeSec)) {
          setReplayProbabilityTimeline([...timeline, frame.probabilityPoint]);
        }
      }
    });

    return () => {
      replayClient.disconnect();
      replayClientRef.current = null;
    };
  }, [activeScenario.id, isMockMode, setReplayProbabilityTimeline, setReplayTime, setStateUpdate]);

  const handleReplayToggle = () => {
    if (isMockMode) {
      toggleReplayPlay();
      return;
    }
    const nextPlaying = !isPlaying;
    replayClientRef.current?.sendControl(nextPlaying ? 'play' : 'pause');
    toggleReplayPlay();
  };

  const handleReplaySpeed = (speed: 1 | 2 | 4 | 8) => {
    setPlaybackSpeed(speed);
    if (!isMockMode) replayClientRef.current?.sendControl('speed', speed);
  };

  const handleReplayReset = () => {
    resetReplay();
    if (!isMockMode) replayClientRef.current?.sendControl('reset');
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-sentinel-bg text-gray-100 overflow-hidden font-sans select-none">
      {/* Top Navigation HUD */}
      <header className="h-14 px-4 bg-sentinel-surface/90 border-b border-sentinel-border flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shadow-[0_0_12px_rgba(168,85,247,0.3)]">
            <Film className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h1 className="text-sm font-mono font-extrabold tracking-widest text-white">
              INCIDENT REPLAY <span className="text-purple-400 font-normal">FLIGHT RECORDER</span>
            </h1>
            <span className="text-[10px] text-gray-400 font-mono">
              Historical PCAP / CSV Replay Engine
            </span>
          </div>
        </div>

        {/* Center Mode Switch */}
        <ModeSwitch />

        {/* Scenario Selector Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-gray-400">SCENARIO:</span>
          <select
            value={activeScenario.id}
            onChange={(e) => {
              const sc = scenarios.find((s) => s.id === e.target.value);
              if (sc) setActiveScenario(sc);
            }}
            className="bg-sentinel-surface-light border border-sentinel-border text-xs font-mono text-gray-200 px-3 py-1.5 rounded-lg focus:outline-none focus:border-purple-400"
          >
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} ({s.dataset})
              </option>
            ))}
          </select>
          {scenarioError && <span className="text-[10px] text-amber-400">{scenarioError}</span>}
        </div>
      </header>

      {/* Main Workspace Split */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Graph Twin (60% width) */}
        <main className="flex-1 relative h-full">
          <NetworkTwin
            nodes={stateUpdate.nodes}
            edges={stateUpdate.edges}
            isForecastMode={isForecastMode}
          />

          {/* Restrained HUD Debrief Banner on Replay Finish */}
          {isDebriefState && (
            <div className="absolute top-8 left-1/2 -translate-x-1/2 z-40 bg-sentinel-surface/95 border border-emerald-500/50 rounded-xl p-4 shadow-2xl backdrop-blur-xl flex items-center gap-4 max-w-md animate-fade-in">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0 animate-pulse" />
              <div>
                <h4 className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest">
                  INCIDENT REPLAY CONCLUDED — DEBRIEF
                </h4>
                <p className="text-sm font-mono text-white font-bold mt-0.5">
                  World-Model Predictive Accuracy: <span className="text-sentinel-cyan">{accuracyRating}%</span>
                </p>
                <p className="text-[11px] text-gray-400 font-sans mt-1">
                  Model successfully forecasted 5/5 MITRE stages 45s prior to exfiltration trigger.
                </p>
              </div>
            </div>
          )}
        </main>

        {/* Right Side: Model vs Baseline Curve Overlay Panel */}
        <aside className="w-96 h-full shrink-0 border-l border-sentinel-border p-3 bg-sentinel-bg/90 backdrop-blur-sm z-20 flex flex-col gap-3 overflow-y-auto">
          {/* Scenario Info */}
          <div className="p-3 bg-sentinel-surface-card rounded-xl border border-sentinel-border text-xs font-mono">
            <span className="text-[10px] text-purple-400 font-bold uppercase block mb-1">
              Active Incident Profile
            </span>
            <h3 className="font-bold text-gray-200">{activeScenario.title}</h3>
            <p className="text-[11px] text-gray-400 font-sans mt-1 leading-relaxed">
              {activeScenario.description}
            </p>
          </div>

          {/* Transport Playback Controls */}
          <div className="p-3 bg-sentinel-surface-card rounded-xl border border-sentinel-border flex flex-col gap-2 font-mono">
            <div className="flex items-center justify-between text-xs text-gray-300">
              <span>PLAYBACK TIMELINE:</span>
              <span className="text-purple-400 font-bold">
                {currentTimeSec}s / {activeScenario.totalDurationSeconds}s
              </span>
            </div>

            <div className="flex items-center justify-center gap-2">
              <button
                onClick={handleReplayReset}
                className="p-2 rounded-lg bg-sentinel-surface-light hover:bg-sentinel-border text-gray-300 transition-colors"
                title="Reset Replay"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={handleReplayToggle}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isPlaying ? 'PAUSE' : 'PLAY REPLAY'}
              </button>

              {/* Speed Buttons */}
              <div className="flex items-center bg-black/40 rounded-lg p-0.5 border border-sentinel-border text-[11px]">
                {([1, 2, 4, 8] as const).map((sp) => (
                  <button
                    key={sp}
                    onClick={() => handleReplaySpeed(sp)}
                    className={`px-2 py-1 rounded font-bold ${
                      playbackSpeed === sp ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {sp}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Model vs Baseline Overlaid Line Chart */}
          <div className="flex-1 min-h-[280px]">
            <BenchmarkComparisonChart mode="probability_timeline" replayTimeline={replayProbabilityTimeline} />
          </div>
        </aside>
      </div>

      {/* Bottom Band */}
      <footer className="h-48 px-4 py-2 bg-sentinel-surface/95 border-t border-sentinel-border flex flex-col justify-between z-30 shrink-0">
        <KillChainRail probs={stateUpdate.killChainProbs} />
        <TimelineScrubber />
      </footer>
    </div>
  );
};
