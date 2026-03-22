import { useQuery } from '@tanstack/react-query';
import { getMySessions, getSession, getSessionNote } from '../../api/session';
import { queryKeys } from '../../constants/queryKeys';
import { Session } from './types';

function calculateStreak(sessions: Session[]) {
  const completedDays = new Set(
    sessions
      .filter((session) => session.status === 'completed')
      .map((session) => new Date(session.startedAt).toISOString().slice(0, 10)),
  );

  let streak = 0;
  const cursor = new Date();

  while (completedDays.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export function useRecentSessionsQuery() {
  return useQuery({
    queryKey: queryKeys.sessionsRecent,
    queryFn: async () => {
      const response = await getMySessions();
      return response.items;
    },
  });
}

export function useSessionHomeQuery() {
  return useQuery({
    queryKey: queryKeys.sessionsToday,
    queryFn: async () => {
      const sessions = (await getMySessions()).items;
      const activeSession = sessions.find((session) => session.status === 'active') ?? null;
      const todayKey = new Date().toISOString().slice(0, 10);
      const todaySessions = sessions.filter((session) => session.startedAt.slice(0, 10) === todayKey);
      const todayFocusMinutes = todaySessions.reduce(
        (total, session) => total + (session.actualMinutes ?? 0),
        0,
      );

      return {
        activeSession,
        recentSessions: sessions.slice(0, 5),
        todayFocusMinutes,
        currentStreakDays: calculateStreak(sessions),
        rankLabel: todayFocusMinutes >= 60 ? 'Focus' : 'Surface',
      };
    },
  });
}

export function useSessionDetailQuery(sessionId: string) {
  return useQuery({
    queryKey: queryKeys.sessionDetail(sessionId),
    queryFn: async () => getSession(sessionId),
    enabled: Boolean(sessionId),
  });
}

export function useSessionNoteQuery(sessionId: string) {
  return useQuery({
    queryKey: queryKeys.sessionNote(sessionId),
    queryFn: async () => getSessionNote(sessionId),
    enabled: Boolean(sessionId),
  });
}
