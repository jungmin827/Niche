import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const SESSION_STORE_KEY = 'niche.mobile.session.ui';

type PersistedSessionState = {
  activeSessionId: string | null;
  activeSessionStartedAt: string | null;
  activeSessionPlannedMinutes: number | null;
  activeSessionTopic: string | null;
  activeSessionSubject: string | null;
  pauseStartedAt: string | null;
  plannedSessionCount: number;
  completedSessionCount: number;
};

const initialSessionState: PersistedSessionState = {
  activeSessionId: null,
  activeSessionStartedAt: null,
  activeSessionPlannedMinutes: null,
  activeSessionTopic: null,
  activeSessionSubject: null,
  pauseStartedAt: null,
  plannedSessionCount: 1,
  completedSessionCount: 0,
};

async function writeSessionState(state: PersistedSessionState) {
  try {
    await AsyncStorage.setItem(SESSION_STORE_KEY, JSON.stringify({ state }));
  } catch {
    // Ignore persistence failures and keep the in-memory session usable.
  }
}

async function clearSessionState() {
  try {
    await AsyncStorage.removeItem(SESSION_STORE_KEY);
  } catch {
    // Ignore persistence failures and keep the in-memory session usable.
  }
}

type SessionStoreState = {
  activeSessionId: PersistedSessionState['activeSessionId'];
  activeSessionStartedAt: PersistedSessionState['activeSessionStartedAt'];
  activeSessionPlannedMinutes: PersistedSessionState['activeSessionPlannedMinutes'];
  activeSessionTopic: PersistedSessionState['activeSessionTopic'];
  activeSessionSubject: PersistedSessionState['activeSessionSubject'];
  pauseStartedAt: PersistedSessionState['pauseStartedAt'];
  plannedSessionCount: number;
  completedSessionCount: number;
  hasHydrated: boolean;
  setActiveSession: (payload: {
    sessionId: string;
    startedAt: string;
    plannedMinutes: number;
    topic: string;
    subject: string | null;
  }) => void;
  setPaused: (pauseStartedAt: string | null) => void;
  clearActiveSession: () => void;
  setPlannedSessionCount: (count: number) => void;
  incrementCompletedSessionCount: () => void;
  resetSessionCounts: () => void;
  markHydrated: () => void;
};

export const useSessionStore = create<SessionStoreState>()((set, get) => ({
  ...initialSessionState,
  hasHydrated: false,
  setActiveSession: ({ sessionId, startedAt, plannedMinutes, topic, subject }) => {
    const nextState: PersistedSessionState = {
      activeSessionId: sessionId,
      activeSessionStartedAt: startedAt,
      activeSessionPlannedMinutes: plannedMinutes,
      activeSessionTopic: topic,
      activeSessionSubject: subject,
      pauseStartedAt: null,
      plannedSessionCount: get().plannedSessionCount,
      completedSessionCount: get().completedSessionCount,
    };
    set(nextState);
    void writeSessionState(nextState);
  },
  setPaused: (pauseStartedAt) =>
    set((state) => {
      const nextState: PersistedSessionState = {
        activeSessionId: state.activeSessionId,
        activeSessionStartedAt: state.activeSessionStartedAt,
        activeSessionPlannedMinutes: state.activeSessionPlannedMinutes,
        activeSessionTopic: state.activeSessionTopic,
        activeSessionSubject: state.activeSessionSubject,
        pauseStartedAt,
        plannedSessionCount: state.plannedSessionCount,
        completedSessionCount: state.completedSessionCount,
      };
      void writeSessionState(nextState);
      return { pauseStartedAt };
    }),
  clearActiveSession: () => {
    const { plannedSessionCount, completedSessionCount } = get();
    const next: PersistedSessionState = {
      ...initialSessionState,
      plannedSessionCount,
      completedSessionCount,
    };
    set(next);
    void writeSessionState(next);
  },
  setPlannedSessionCount: (count) => {
    set((state) => {
      const next: PersistedSessionState = {
        activeSessionId: state.activeSessionId,
        activeSessionStartedAt: state.activeSessionStartedAt,
        activeSessionPlannedMinutes: state.activeSessionPlannedMinutes,
        activeSessionTopic: state.activeSessionTopic,
        activeSessionSubject: state.activeSessionSubject,
        pauseStartedAt: state.pauseStartedAt,
        plannedSessionCount: count,
        completedSessionCount: state.completedSessionCount,
      };
      void writeSessionState(next);
      return { plannedSessionCount: count };
    });
  },
  incrementCompletedSessionCount: () => {
    set((state) => {
      const next: PersistedSessionState = {
        activeSessionId: state.activeSessionId,
        activeSessionStartedAt: state.activeSessionStartedAt,
        activeSessionPlannedMinutes: state.activeSessionPlannedMinutes,
        activeSessionTopic: state.activeSessionTopic,
        activeSessionSubject: state.activeSessionSubject,
        pauseStartedAt: state.pauseStartedAt,
        plannedSessionCount: state.plannedSessionCount,
        completedSessionCount: state.completedSessionCount + 1,
      };
      void writeSessionState(next);
      return { completedSessionCount: next.completedSessionCount };
    });
  },
  resetSessionCounts: () => {
    set((state) => {
      const next: PersistedSessionState = {
        activeSessionId: state.activeSessionId,
        activeSessionStartedAt: state.activeSessionStartedAt,
        activeSessionPlannedMinutes: state.activeSessionPlannedMinutes,
        activeSessionTopic: state.activeSessionTopic,
        activeSessionSubject: state.activeSessionSubject,
        pauseStartedAt: state.pauseStartedAt,
        plannedSessionCount: 1,
        completedSessionCount: 0,
      };
      void writeSessionState(next);
      return { plannedSessionCount: 1, completedSessionCount: 0 };
    });
  },
  markHydrated: () => set({ hasHydrated: true }),
}));

async function hydrateSessionStore() {
  try {
    const raw = await AsyncStorage.getItem(SESSION_STORE_KEY);
    if (!raw) {
      useSessionStore.getState().markHydrated();
      return;
    }

    const parsed = JSON.parse(raw) as { state?: PersistedSessionState } | PersistedSessionState;
    const persisted = 'state' in parsed && parsed.state ? parsed.state : parsed;

    useSessionStore.setState({
      ...initialSessionState,
      ...persisted,
      hasHydrated: true,
    });
  } catch {
    useSessionStore.getState().markHydrated();
  }
}

void hydrateSessionStore();
