import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import ArchiveHero from '../../../components/archive/ArchiveHero';
import HighlightCard from '../../../components/archive/HighlightCard';
import Screen from '../../../components/layout/Screen';
import TopBar from '../../../components/layout/TopBar';
import AppButton from '../../../components/ui/AppButton';
import AppText from '../../../components/ui/AppText';
import AppCard from '../../../components/ui/AppCard';
import { toApiError } from '../../../lib/error';
import { routes } from '../../../constants/routes';
import { useArchiveQuery } from '../hooks';

export default function ArchiveHomeScreen() {
  const archiveQuery = useArchiveQuery();
  const archive = archiveQuery.data;

  return (
    <Screen scroll>
      <TopBar title="아카이브" subtitle="내 세계가 정리되어 남는 곳입니다." />

      {archiveQuery.isLoading ? (
        <AppText variant="body">아카이브를 불러오는 중입니다.</AppText>
      ) : archiveQuery.isError ? (
        <AppCard className="gap-4 bg-[#F6F6F4]">
          <AppText variant="title">아카이브를 불러오지 못했습니다.</AppText>
          <AppText variant="bodySmall" className="text-[#555555]">
            {toApiError(archiveQuery.error).message}
          </AppText>
          <AppButton label="다시 시도" variant="secondary" onPress={() => archiveQuery.refetch()} />
        </AppCard>
      ) : archive ? (
        <View className="gap-8">
          <ArchiveHero
            currentRankCode={archive.profile.currentRankCode}
            displayName={archive.profile.displayName}
            totalFocusMinutes={archive.stats.totalFocusMinutes}
            totalHighlights={archive.stats.totalHighlights}
          />

          <View className="gap-4">
            <AppText variant="title">하이라이트</AppText>
            {archive.highlights.items.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-5 pr-6">
                  {archive.highlights.items.map((highlight) => (
                    <HighlightCard
                      key={highlight.id}
                      highlight={highlight}
                      onPress={() => router.push(routes.archiveHighlightDetail(highlight.id))}
                    />
                  ))}
                </View>
              </ScrollView>
            ) : (
              <View className="rounded-[20px] border border-[#D9D9D4] bg-[#F6F6F4] px-5 py-6">
                <AppText variant="bodySmall" className="text-[#555555]">
                  아직 남겨둔 기록이 없어요.
                </AppText>
                <AppText variant="bodySmall" className="mt-2 text-[#555555]">
                  세션을 마치고 글이나 하이라이트를 남겨보세요.
                </AppText>
              </View>
            )}
          </View>

          <View className="gap-4">
            <AppText variant="title">글</AppText>
            <View className="rounded-[20px] border border-dashed border-[#D9D9D4] bg-[#F6F6F4] px-5 py-6">
              <AppText variant="bodySmall" className="text-[#555555]">
                아직 쓴 글이 없어요.
              </AppText>
              <AppText variant="bodySmall" className="mt-2 text-[#555555]">
                오늘 스쳐간 생각부터 적어보세요.
              </AppText>
            </View>
          </View>
        </View>
      ) : (
        <AppText variant="body">아카이브를 준비하는 중입니다.</AppText>
      )}
    </Screen>
  );
}
