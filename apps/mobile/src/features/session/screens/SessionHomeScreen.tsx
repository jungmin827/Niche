import { router } from 'expo-router';
import { useEffect } from 'react';
import SessionStartCard from '../../../components/session/SessionStartCard';
import { ApiError } from '../../../lib/error';
import { routes } from '../../../constants/routes';
import {
  useCreateSessionMutation,
  useSessionDetailQuery,
  useSessionHomeQuery,
  useSessionStore,
} from '../hooks';

export default function SessionHomeScreen() {
  const homeQuery = useSessionHomeQuery();
  const createSessionMutation = useCreateSessionMutation();
  const activeSessionId = useSessionStore((state) => state.activeSessionId);
  const clearActiveSession = useSessionStore((state) => state.clearActiveSession);
  const setActiveSession = useSessionStore((state) => state.setActiveSession);
  const setPlannedSessionCount = useSessionStore((state) => state.setPlannedSessionCount);
  const resetSessionCounts = useSessionStore((state) => state.resetSessionCounts);

  // 저장된 세션 ID가 서버에 실제로 존재하는지 검증.
  // 없으면 (404) 스토어를 클리어해서 ghost session 상태를 해소한다.
  const sessionVerifyQuery = useSessionDetailQuery(activeSessionId ?? '');
  useEffect(() => {
    if (!activeSessionId || !sessionVerifyQuery.isError) return;
    const err = sessionVerifyQuery.error as ApiError;
    if (err?.code === 'SESSION_NOT_FOUND') {
      clearActiveSession();
    }
  }, [activeSessionId, sessionVerifyQuery.isError, sessionVerifyQuery.error, clearActiveSession]);

  // 서버에 active session이 있지만 store에 없는 경우(앱 재설치 등) 자동 동기화.
  const serverActiveSession = homeQuery.data?.activeSession;
  useEffect(() => {
    if (activeSessionId || !serverActiveSession) return;
    setActiveSession({
      sessionId: serverActiveSession.id,
      startedAt: serverActiveSession.startedAt,
      plannedMinutes: serverActiveSession.plannedMinutes,
      topic: serverActiveSession.topic ?? '',
      subject: serverActiveSession.subject ?? null,
    });
  }, [activeSessionId, serverActiveSession, setActiveSession]);

  const homeData = homeQuery.data;

  return (
    <SessionStartCard
      streakDays={homeData?.currentStreakDays ?? 0}
      rankLabel={homeData?.rankLabel ?? 'Surface'}
      todayFocusMinutes={homeData?.todayFocusMinutes ?? 0}
      hasActiveSession={!!activeSessionId}
      isSubmitting={createSessionMutation.isPending}
      onResumeSession={() => router.push(routes.sessionActive)}
      onSubmit={async ({ topic, subject, plannedMinutes, plannedSessionCount }) => {
        resetSessionCounts();
        setPlannedSessionCount(plannedSessionCount);
        await createSessionMutation.mutateAsync({
          topic,
          subject,
          plannedMinutes,
          source: 'book',
        });
        router.push(routes.sessionActive);
      }}
    />
  );
}
