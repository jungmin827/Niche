import { View } from 'react-native';
import AppCard from '../ui/AppCard';
import AppText from '../ui/AppText';

type Props = {
  streakDays: number;
  rankLabel: string;
  todayFocusMinutes: number;
};

export default function SessionStreakCard({ streakDays, rankLabel, todayFocusMinutes }: Props) {
  return (
    <AppCard className="gap-6">
      <View className="flex-row items-start justify-between gap-4">
        <View className="gap-2">
          <AppText variant="caption" className="text-[#555555]">
            오늘의 누적
          </AppText>
          <AppText variant="hero" className="text-[36px] leading-[40px]">
            {todayFocusMinutes}분
          </AppText>
        </View>
        <View className="items-end gap-2">
          <AppText variant="caption" className="text-[#555555]">
            현재 랭크
          </AppText>
          <AppText variant="title">{rankLabel}</AppText>
        </View>
      </View>

      <AppText variant="bodySmall" className="text-[#555555]">
        {streakDays > 0 ? `${streakDays}일째 이어지고 있어요.` : '오늘의 첫 흐름을 열어보세요.'}
      </AppText>
    </AppCard>
  );
}
