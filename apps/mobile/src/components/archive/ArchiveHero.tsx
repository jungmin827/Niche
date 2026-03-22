import { View } from 'react-native';
import AppCard from '../ui/AppCard';
import AppText from '../ui/AppText';

type Props = {
  displayName: string;
  currentRankCode: string;
  totalFocusMinutes: number;
  totalHighlights: number;
};

export default function ArchiveHero({
  displayName,
  currentRankCode,
  totalFocusMinutes,
  totalHighlights,
}: Props) {
  return (
    <AppCard className="gap-6">
      <View className="gap-2">
        <AppText variant="caption" className="text-[#8A8A84] tracking-[0.8px]">
          ARCHIVE
        </AppText>
        <AppText variant="title">{displayName}</AppText>
        <AppText variant="bodySmall" className="text-[#555555]">
          조용히 쌓여온 흔적
        </AppText>
      </View>
      <View className="flex-row items-end justify-between gap-4">
        <View className="gap-2">
          <AppText variant="caption" className="text-[#555555]">
            누적 시간
          </AppText>
          <AppText variant="hero" className="text-[36px] leading-[40px]">
            {totalFocusMinutes}분
          </AppText>
        </View>
        <View className="items-end gap-2">
          <AppText variant="caption" className="text-[#555555]">
            현재 랭크
          </AppText>
          <AppText variant="title">{currentRankCode}</AppText>
        </View>
      </View>
      <AppText variant="bodySmall" className="text-[#555555]">
        저장한 하이라이트 {totalHighlights}
      </AppText>
    </AppCard>
  );
}
