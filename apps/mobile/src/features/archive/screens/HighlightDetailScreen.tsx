import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import HighlightCard from '../../../components/archive/HighlightCard';
import Screen from '../../../components/layout/Screen';
import TopBar from '../../../components/layout/TopBar';
import AppButton from '../../../components/ui/AppButton';
import AppCard from '../../../components/ui/AppCard';
import AppText from '../../../components/ui/AppText';
import { routes } from '../../../constants/routes';
import { toApiError } from '../../../lib/error';
import { useHighlightDetailQuery } from '../hooks';

export default function HighlightDetailScreen() {
  const { highlightId } = useLocalSearchParams<{ highlightId?: string }>();
  const detailQuery = useHighlightDetailQuery(highlightId ?? '');

  if (!highlightId) {
    return (
      <Screen>
        <TopBar title="하이라이트" leadingLabel="닫기" onLeadingPress={() => router.replace(routes.archiveHome)} />
        <AppText variant="body">하이라이트를 찾을 수 없습니다.</AppText>
      </Screen>
    );
  }

  const data = detailQuery.data;

  return (
    <Screen scroll>
      <TopBar
        title="하이라이트"
        subtitle="남겨둔 시간의 표면을 다시 봅니다."
        leadingLabel="닫기"
        onLeadingPress={() => router.replace(routes.archiveHome)}
      />

      {detailQuery.isLoading ? (
        <AppText variant="body">하이라이트를 불러오는 중입니다.</AppText>
      ) : detailQuery.isError ? (
        <AppCard className="gap-4 bg-[#F6F6F4]">
          <AppText variant="title">하이라이트를 불러오지 못했습니다.</AppText>
          <AppText variant="bodySmall" className="text-[#555555]">
            {toApiError(detailQuery.error).message}
          </AppText>
          <AppButton label="다시 시도" variant="secondary" onPress={() => detailQuery.refetch()} />
        </AppCard>
      ) : data ? (
        <View className="gap-8">
          <HighlightCard highlight={data.highlight} note={data.note} session={data.session} />

          <AppCard className="gap-5">
            <AppText variant="title">남겨둔 문장</AppText>
            <AppText variant="body">{data.highlight.caption}</AppText>
            {data.note?.summary ? (
              <AppText variant="bodySmall" className="text-[#555555]">
                {data.note.summary}
              </AppText>
            ) : null}
          </AppCard>

          {data.sourceLinkageMissing ? (
            <AppCard className="gap-4 bg-[#F6F6F4]">
              <AppText variant="title">원본 세션을 아직 연결하지 못했습니다.</AppText>
              <AppText variant="bodySmall" className="text-[#555555]">
                하이라이트는 보이지만 세션 정보는 아직 불러오지 못했습니다.
              </AppText>
              <AppButton label="다시 시도" variant="secondary" onPress={() => detailQuery.refetch()} />
            </AppCard>
          ) : null}

          {data.sourceLinkageRecovered ? (
            <AppText variant="caption" className="text-[#8A8A84]">
              세션 정보는 목록 데이터로 다시 연결했습니다.
            </AppText>
          ) : null}

          {data.session ? (
            <AppCard className="gap-4">
              <AppText variant="title">세션 정보</AppText>
              <AppText variant="body">{data.session.topic}</AppText>
              <AppText variant="bodySmall" className="text-[#555555]">
                {data.session.actualMinutes ?? data.session.plannedMinutes}분
              </AppText>
            </AppCard>
          ) : null}

          <View className="gap-3">
            <AppButton
              label="공유 다시 보기"
              disabled={!data.highlight.sessionId}
              onPress={() =>
                data.highlight.sessionId
                  ? router.push(routes.sharePreviewModal(data.highlight.sessionId))
                  : undefined
              }
            />
            {data.highlight.sessionId ? (
              <AppButton
                label="세션 보기"
                variant="secondary"
                onPress={() => router.push(routes.sessionDetail(data.highlight.sessionId!))}
              />
            ) : null}
          </View>
        </View>
      ) : (
        <AppText variant="body">하이라이트를 준비하는 중입니다.</AppText>
      )}
    </Screen>
  );
}
