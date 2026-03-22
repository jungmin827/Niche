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

export default function SessionDetailScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const detailQuery = useSessionDetailQuery(sessionId ?? '');

  if (!sessionId) {
    return (
      <Screen>
        <TopBar title="세션" leadingLabel="닫기" onLeadingPress={() => router.replace(routes.sessionHome)} />
        <AppText variant="body">세션을 찾을 수 없습니다.</AppText>
      </Screen>
    );
  }

  const session = detailQuery.data?.session;
  const note = detailQuery.data?.note;

  return (
    <Screen scroll>
      <TopBar
        title="세션 기록"
        subtitle="남겨둔 시간과 문장을 다시 봅니다."
        leadingLabel="닫기"
        onLeadingPress={() => router.replace(routes.sessionHome)}
      />

      {detailQuery.isLoading ? (
        <AppText variant="body">세션을 불러오는 중입니다.</AppText>
      ) : detailQuery.isError ? (
        <AppCard className="gap-4 bg-[#F6F6F4]">
          <AppText variant="title">세션을 불러오지 못했습니다.</AppText>
          <AppText variant="bodySmall" className="text-[#555555]">
            {toApiError(detailQuery.error).message}
          </AppText>
          <AppButton label="다시 시도" variant="secondary" onPress={() => detailQuery.refetch()} />
        </AppCard>
      ) : session ? (
        <View className="gap-6">
          <SessionSummaryCard session={session} />

          <AppCard className="gap-5">
            <AppText variant="title">기록</AppText>
            {note ? (
              <View className="gap-5">
                <View className="gap-2">
                  <AppText variant="caption" className="text-[#8A8A84]">
                    무엇을 봤나요?
                  </AppText>
                  <AppText variant="body">{note.summary}</AppText>
                </View>
                {note.insight ? (
                  <View className="gap-2">
                    <AppText variant="caption" className="text-[#8A8A84]">
                      어떤 점이 남았나요?
                    </AppText>
                    <AppText variant="body">{note.insight}</AppText>
                  </View>
                ) : null}
                <AppButton
                  label="하이라이트 만들기"
                  onPress={() => router.push(routes.sharePreviewModal(sessionId ?? ''))}
                />
              </View>
            ) : (
              <View className="gap-4">
                <AppText variant="bodySmall" className="text-[#555555]">
                  아직 기록이 없습니다.
                </AppText>
                <AppButton
                  label="기록하기"
                  onPress={() =>
                    router.push({
                      pathname: routes.sessionNoteModal,
                      params: { sessionId },
                    })
                  }
                />
              </View>
            )}
          </AppCard>

        </View>
      ) : (
        <AppText variant="body">세션을 찾을 수 없습니다.</AppText>
      )}
    </Screen>
  );
}
