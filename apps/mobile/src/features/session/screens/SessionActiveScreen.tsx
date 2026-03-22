import { router } from 'expo-router';
import { useEffect } from 'react';
import { Alert, View } from 'react-native';
import Screen from '../../../components/layout/Screen';
import TopBar from '../../../components/layout/TopBar';
import SessionTimer from '../../../components/session/SessionTimer';
import AppButton from '../../../components/ui/AppButton';
import AppCard from '../../../components/ui/AppCard';
import AppText from '../../../components/ui/AppText';
import { routes } from '../../../constants/routes';
import { toApiError } from '../../../lib/error';
import {
  useCancelSessionMutation,
  useCompleteSessionMutation,
  useSessionDetailQuery,
  useSessionStore,
} from '../hooks';

export default function SessionActiveScreen() {
  const activeSessionId = useSessionStore((state) => state.activeSessionId);
  const activeSessionStartedAt = useSessionStore((state) => state.activeSessionStartedAt);
  const activeSessionPlannedMinutes = useSessionStore((state) => state.activeSessionPlannedMinutes);
  const activeSessionTopic = useSessionStore((state) => state.activeSessionTopic);
  const activeSessionSubject = useSessionStore((state) => state.activeSessionSubject);
  const clearActiveSession = useSessionStore((state) => state.clearActiveSession);
  const completeMutation = useCompleteSessionMutation();
  const cancelMutation = useCancelSessionMutation();
  const sessionDetailQuery = useSessionDetailQuery(activeSessionId ?? '');

  useEffect(() => {
    if (sessionDetailQuery.data?.session.status && sessionDetailQuery.data.session.status !== 'active') {
      clearActiveSession();
    }
  }, [clearActiveSession, sessionDetailQuery.data?.session.status]);

  if (!activeSessionId || !activeSessionStartedAt || !activeSessionPlannedMinutes || !activeSessionTopic) {
    return (
      <Screen>
        <TopBar title="세션" />
        <View className="flex-1 items-center justify-center gap-4">
          <AppText variant="body">진행 중인 세션이 없습니다.</AppText>
          <AppButton label="세션으로" onPress={() => router.replace(routes.sessionHome)} />
        </View>
      </Screen>
    );
  }

  if (sessionDetailQuery.isLoading && !sessionDetailQuery.data) {
    return (
      <Screen>
        <TopBar title="진행 중인 세션" />
        <View className="flex-1 items-center justify-center">
          <AppText variant="body">세션 상태를 확인하는 중입니다.</AppText>
        </View>
      </Screen>
    );
  }

  if (sessionDetailQuery.isError) {
    return (
      <Screen>
        <TopBar title="진행 중인 세션" />
        <AppCard className="gap-4 bg-[#F6F6F4]">
          <AppText variant="title">세션 상태를 불러오지 못했습니다.</AppText>
          <AppText variant="bodySmall" className="text-[#555555]">
            {toApiError(sessionDetailQuery.error).message}
          </AppText>
          <AppButton label="다시 시도" variant="secondary" onPress={() => sessionDetailQuery.refetch()} />
        </AppCard>
      </Screen>
    );
  }

  return (
    <Screen>
      <TopBar
        leadingLabel="나가기"
        onLeadingPress={() => router.replace(routes.sessionHome)}
        title="진행 중인 세션"
        subtitle="시간과 주제만 또렷하게 남겨둡니다."
      />

      <View className="flex-1 justify-between gap-10">
        <View className="gap-10">
          <AppCard className="items-center gap-8 py-12">
            <View className="items-center gap-3">
              <AppText variant="caption" className="text-[#8A8A84] tracking-[0.8px]">
                {activeSessionSubject || '오늘의 주제'}
              </AppText>
              <AppText variant="title" className="text-center text-[24px] leading-[30px]">
                {activeSessionTopic}
              </AppText>
            </View>

            <SessionTimer plannedMinutes={activeSessionPlannedMinutes} startedAt={activeSessionStartedAt} />
          </AppCard>

          <AppText variant="bodySmall" className="px-6 text-center text-[#555555]">
            {activeSessionPlannedMinutes}분 동안 한 가지에 머물러보세요.
          </AppText>
        </View>

        <View className="gap-3">
          <AppButton
            disabled={completeMutation.isPending}
            label="완료하기"
            onPress={async () => {
              const response = await completeMutation.mutateAsync(activeSessionId);
              router.replace({
                pathname: routes.sessionComplete,
                params: { sessionId: response.session.id },
              });
            }}
          />
          <AppButton
            disabled={cancelMutation.isPending}
            label="그만두기"
            variant="secondary"
            onPress={() =>
              Alert.alert('세션을 닫을까요?', '지금 세션은 취소됩니다.', [
                { text: '계속 보기', style: 'cancel' },
                {
                  text: '그만두기',
                  style: 'destructive',
                  onPress: async () => {
                    await cancelMutation.mutateAsync(activeSessionId);
                    router.replace(routes.sessionHome);
                  },
                },
              ])
            }
          />
        </View>
      </View>
    </Screen>
  );
}
