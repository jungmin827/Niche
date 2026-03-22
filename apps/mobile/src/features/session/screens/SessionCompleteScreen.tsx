import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import Screen from '../../../components/layout/Screen';
import TopBar from '../../../components/layout/TopBar';
import SessionSummaryCard from '../../../components/session/SessionSummaryCard';
import AppButton from '../../../components/ui/AppButton';
import AppCard from '../../../components/ui/AppCard';
import AppText from '../../../components/ui/AppText';
import { routes } from '../../../constants/routes';
import { toApiError } from '../../../lib/error';
import { useSessionDetailQuery } from '../hooks';

export default function SessionCompleteScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const detailQuery = useSessionDetailQuery(sessionId ?? '');

  if (!sessionId) {
    return (
      <Screen>
        <TopBar title="세션 완료" />
        <AppText variant="body">완료한 세션을 찾을 수 없습니다.</AppText>
      </Screen>
    );
  }

  const session = detailQuery.data?.session;

  return (
    <Screen scroll>
      <TopBar title="세션 완료" subtitle="세션이 완료되었어요." />

      {detailQuery.isLoading ? (
        <AppText variant="body">세션을 불러오는 중입니다.</AppText>
      ) : detailQuery.isError ? (
        <AppCard className="gap-4 bg-[#F6F6F4]">
          <AppText variant="title">완료한 세션을 불러오지 못했습니다.</AppText>
          <AppText variant="bodySmall" className="text-[#555555]">
            {toApiError(detailQuery.error).message}
          </AppText>
          <AppButton label="다시 시도" variant="secondary" onPress={() => detailQuery.refetch()} />
        </AppCard>
      ) : session ? (
        <View className="gap-8">
          <View className="gap-3">
            <AppText variant="caption" className="text-[#8A8A84] tracking-[0.8px]">
              SESSION COMPLETE
            </AppText>
            <AppText variant="hero" className="text-[36px] leading-[40px]">
              조용히 남았습니다.
            </AppText>
            <AppText variant="bodySmall" className="text-[#555555]">
              무엇을 봤는지 짧게 적어두면 다음 흐름이 더 선명해집니다.
            </AppText>
          </View>

          <SessionSummaryCard session={session} />

          <View className="gap-3">
            <AppButton
              label="기록 남기기"
              onPress={() =>
                router.push({
                  pathname: routes.sessionNoteModal,
                  params: { sessionId },
                })
              }
            />
            <AppButton
              label="나중에"
              variant="secondary"
              onPress={() => router.replace(routes.sessionDetail(sessionId))}
            />
          </View>
        </View>
      ) : (
        <AppText variant="body">완료한 세션을 찾을 수 없습니다.</AppText>
      )}
    </Screen>
  );
}
