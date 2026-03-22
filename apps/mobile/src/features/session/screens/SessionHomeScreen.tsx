import { router } from 'expo-router';
import SessionStartCard from '../../../components/session/SessionStartCard';
import { routes } from '../../../constants/routes';
import { useCreateSessionMutation, useSessionHomeQuery, useSessionStore } from '../hooks';

export default function SessionHomeScreen() {
  const homeQuery = useSessionHomeQuery();
  const createSessionMutation = useCreateSessionMutation();
  const activeSessionId = useSessionStore((state) => state.activeSessionId);
  const setPlannedSessionCount = useSessionStore((state) => state.setPlannedSessionCount);
  const resetSessionCounts = useSessionStore((state) => state.resetSessionCounts);

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
