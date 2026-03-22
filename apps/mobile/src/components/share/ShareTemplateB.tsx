import { View } from 'react-native';
import { ShareModel } from '../../features/share/types';
import AppText from '../ui/AppText';

type Props = {
  model: ShareModel;
};

export default function ShareTemplateB({ model }: Props) {
  return (
    <View className="aspect-[9/16] w-full rounded-[28px] border border-[#D9D9D4] bg-[#F6F6F4] px-7 py-8">
      <View className="flex-1 justify-between">
        <View className="gap-4">
          <AppText variant="caption" className="text-[#555555] tracking-[0.8px]">
            오늘의 기록
          </AppText>
          <AppText variant="hero" className="text-[36px] leading-[40px] tracking-[-0.8px]" numberOfLines={3}>
            {model.title}
          </AppText>
        </View>

        <View className="gap-4">
          <View className="gap-2">
            <AppText variant="bodySmall" className="text-[#555555]">
              {model.focusLabel}
            </AppText>
            <AppText variant="body" numberOfLines={3}>
              {model.caption}
            </AppText>
          </View>
          <AppText variant="caption" className="text-[#8A8A84]">
            {model.dateLabel}
          </AppText>
        </View>
      </View>
    </View>
  );
}
