import { create } from 'zustand';
import type { StateUpdate, IncidentScenario, ReplayProbabilityPoint, NodeForecast } from '../types/sentinel';
import { API_BASE_URL } from '../config/endpoints';
import { mockEngineInstance, SCENARIOS } from '../services/mockEngine';

export type AppMode = 'live' | 'replay';
export type WsConnectionStatus = 'connected' | 'reconnecting' | 'standalone_mock';

interface UserProfile {
  email: string;
  name: string;
  role: string;
}

interface SentinelState {
  // Auth state
  isAuthenticated: boolean;
  authToken: string | null;
  user: UserProfile | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;

  mode: AppMode;
  wsStatus: WsConnectionStatus;
  isMockMode: boolean;
  
  // Timeline Scrubber State
  tOffset: number; // 0 = Now, 1..5 = Forecast T+k, -1..-10 = Observed Past
  isForecastMode: boolean;

  // Selection state
  selectedNodeId: string | null;
  selectedEdgeId: string | null;

  // Real-time or Replayed State Update
  stateUpdate: StateUpdate;

  // Incident Replay State
  activeScenario: IncidentScenario;
  replayPlayback: {
    isPlaying: boolean;
    currentTimeSec: number;
    playbackSpeed: 1 | 2 | 4 | 8;
    isDebriefState: boolean;
    accuracyRating: number;
  };

  // Actions
  setMode: (mode: AppMode) => void;
  setTOffset: (offset: number) => void;
  setSelectedNodeId: (nodeId: string | null) => void;
  setSelectedEdgeId: (edgeId: string | null) => void;
  setWsStatus: (status: WsConnectionStatus) => void;
  setMockMode: (isMock: boolean) => void;
  setStateUpdate: (update: StateUpdate) => void;
  setNodeConnectionState: (nodeId: string, isConnected: boolean) => void;
  replayProbabilityTimeline: ReplayProbabilityPoint[];
  setReplayProbabilityTimeline: (timeline: ReplayProbabilityPoint[]) => void;
  nodeForecast: NodeForecast | null;
  setNodeForecast: (forecast: NodeForecast | null) => void;
  
  // Replay actions
  setActiveScenario: (scenario: IncidentScenario) => void;
  toggleReplayPlay: () => void;
  setReplayTime: (timeSec: number) => void;
  setPlaybackSpeed: (speed: 1 | 2 | 4 | 8) => void;
  stepReplay: (deltaSec: number) => void;
  resetReplay: () => void;
  
  // Tick method for live simulation
  tickLiveSimulation: () => void;
}

const initialToken = localStorage.getItem('sentinel_auth_token');

export const useSentinelStore = create<SentinelState>((set, get) => ({
  isAuthenticated: Boolean(initialToken),
  authToken: initialToken,
  user: initialToken ? { email: 'admin@sentinel.ai', name: 'SOC Lead Analyst', role: 'Administrator' } : null,


  login: async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        return false;
      }

      const data = await res.json();
      localStorage.setItem('sentinel_auth_token', data.access_token);
      set({
        isAuthenticated: true,
        authToken: data.access_token,
        user: data.user,
      });
      return true;
    } catch (err) {
      console.error('Login request failed:', err);
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('sentinel_auth_token');
    set({
      isAuthenticated: false,
      authToken: null,
      user: null
    });
  },

  mode: 'live',
  wsStatus: 'standalone_mock',
  isMockMode: false,

  tOffset: 0,

  isForecastMode: false,

  selectedNodeId: '10.0.0.5', // Default selected for deep-dive preview
  selectedEdgeId: null,

  stateUpdate: mockEngineInstance.generateStateUpdate(0, false),

  activeScenario: SCENARIOS[0],
  replayPlayback: {
    isPlaying: false,
    currentTimeSec: 0,
    playbackSpeed: 1,
    isDebriefState: false,
    accuracyRating: 91.8,
  },

  setMode: (mode) => set({ mode, tOffset: 0, isForecastMode: false }),

  setTOffset: (offset) => {
    const isForecastMode = offset > 0;
    // When scrubber moves, regenerate state with offset so nodes/edges/SHAP sync
    const updatedState = mockEngineInstance.generateStateUpdate(offset, isForecastMode);
    set({
      tOffset: offset,
      isForecastMode,
      stateUpdate: updatedState,
    });
  },

  setSelectedNodeId: (nodeId) => set({ selectedNodeId: nodeId }),
  setSelectedEdgeId: (edgeId) => set({ selectedEdgeId: edgeId }),
  setWsStatus: (wsStatus) => set({ wsStatus }),
  setMockMode: (isMockMode) => set({ 
    isMockMode, 
    wsStatus: isMockMode ? 'standalone_mock' : 'reconnecting' 
  }),

  setStateUpdate: (stateUpdate) => set({ stateUpdate }),
  setNodeConnectionState: (nodeId, isConnected) => set((state) => ({
    stateUpdate: {
      ...state.stateUpdate,
      nodes: state.stateUpdate.nodes.map((node) =>
        node.id === nodeId ? { ...node, isConnected } : node
      ),
    },
  })),
  replayProbabilityTimeline: [],
  setReplayProbabilityTimeline: (replayProbabilityTimeline) => set({ replayProbabilityTimeline }),
  nodeForecast: null,
  setNodeForecast: (nodeForecast) => set({ nodeForecast }),

  setActiveScenario: (scenario) => set({
    activeScenario: scenario,
    replayPlayback: {
      isPlaying: false,
      currentTimeSec: 0,
      playbackSpeed: 1,
      isDebriefState: false,
      accuracyRating: 92.4,
    },
    replayProbabilityTimeline: [],
  }),

  toggleReplayPlay: () => {
    const current = get().replayPlayback;
    set({
      replayPlayback: {
        ...current,
        isPlaying: !current.isPlaying,
        isDebriefState: current.isPlaying ? current.isDebriefState : false
      }
    });
  },

  setReplayTime: (timeSec) => {
    const scenario = get().activeScenario;
    const isFinished = timeSec >= scenario.totalDurationSeconds;
    const current = get().replayPlayback;

    set({
      replayPlayback: {
        ...current,
        currentTimeSec: Math.min(scenario.totalDurationSeconds, Math.max(0, timeSec)),
        isPlaying: isFinished ? false : current.isPlaying,
        isDebriefState: isFinished,
      }
    });
  },

  setPlaybackSpeed: (speed) => {
    const current = get().replayPlayback;
    set({ replayPlayback: { ...current, playbackSpeed: speed } });
  },

  stepReplay: (deltaSec) => {
    const currentSec = get().replayPlayback.currentTimeSec;
    get().setReplayTime(currentSec + deltaSec);
  },

  resetReplay: () => {
    const current = get().replayPlayback;
    set({
      replayPlayback: {
        ...current,
        isPlaying: false,
        currentTimeSec: 0,
        isDebriefState: false,
      },
      replayProbabilityTimeline: [],
    });
  },

  tickLiveSimulation: () => {
    const { isMockMode, tOffset, isForecastMode } = get();
    if (isMockMode) {
      const update = mockEngineInstance.generateStateUpdate(tOffset, isForecastMode);
      set({ stateUpdate: update });
    }
  }
}));
