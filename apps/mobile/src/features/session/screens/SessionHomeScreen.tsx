import { router } from 'expo-router';
import { View } from 'react-native';
import TopBar from '../../../components/layout/TopBar';
import Screen from '../../../components/layout/Screen';
import SessionStartCard from '../../../components/session/SessionStartCard';
import SessionStreakCard from '../../../components/session/SessionStreakCard';
import SessionSummaryCard from '../../../components/session/SessionSummaryCard';
import AppButton from '../../../components/ui/AppButton';
import AppCard from '../../../components/ui/AppCard';
import AppText from '../../../components/ui/AppText';
import { routes } from '../../../constants/routes';
import { toApiError } from '../../../lib/error';
import { useCreateSessionMutation, useSessionHomeQuery } from '../hooks';

export default function SessionHomeScreen() {
  const homeQuery = useSessionHomeQuery();
  const createSessionMutation = useCreateSessionMutation();

  const homeData = homeQuery.data;

  return (
    <Screen scroll>
      <TopBar title="세션" subtitle="오늘의 한 흐름을 여는 곳입니다." />

      {homeQuery.isLoading ? (
        <AppText variant="body">세션을 불러오는 중입니다.</AppText>
      ) : homeQuery.isError ? (
        <AppCard className="gap-4 bg-[#F6F6F4]">
          <AppText variant="title">세션을 불러오지 못했습니다.</AppText>
          <AppText variant="bodySmall" className="text-[#555555]">
            {toApiError(homeQuery.error).message}
          </AppText>
          <AppButton label="다시 시도" variant="secondary" onPress={() => homeQuery.refetch()} />
        </AppCard>
      ) : homeData ? (
        <View className="gap-8">
          <SessionStreakCard
            rankLabel={homeData.rankLabel}
            streakDays={homeData.currentStreakDays}
            todayFocusMinutes={homeData.todayFocusMinutes}
          />

          {homeData.activeSession ? (
            <View className="gap-4">
              <AppText variant="caption" className="text-[#8A8A84] tracking-[0.6px]">
                진행 중인 세션
              </AppText>
              <SessionSummaryCard session={homeData.activeSession} />
              <AppButton label="이어가기" onPress={() => router.push(routes.sessionActive)} />
            </View>
          ) : (
            <SessionStartCard
              isSubmitting={createSessionMutation.isPending}
              onSubmit={async ({ topic, subject, plannedMinutes }) => {
                const response = await createSessionMutation.mutateAsync({
                  topic,
                  subject,
                  plannedMinutes,
                  source: 'book',
                });

                router.push(routes.sessionActive);
                return response;
              }}
            />
          )}

          <View className="gap-4">
            <AppText variant="caption" className="text-[#8A8A84] tracking-[0.6px]">
              최근 세션
            </AppText>
            {homeData.recentSessions.length > 0 ? (
              homeData.recentSessions.map((session) => (
                <SessionSummaryCard key={session.id} session={session} />
              ))
            ) : (
              <View className="rounded-[20px] border border-[#D9D9D4] bg-[#F6F6F4] px-5 py-6">
                <AppText variant="bodySmall" className="text-[#555555]">
                  아직 시작한 세션이 없어요.
                </AppText>
                <AppText variant="bodySmall" className="mt-2 text-[#555555]">
                  오늘의 첫 세션을 열어보세요.
                </AppText>
              </View>
            )}
          </View>
        </View>
      ) : (
        <AppText variant="body">세션을 준비하는 중입니다.</AppText>
      )}
    </Screen>
  );
}
