import { View } from 'react-native';
import { ShareModel } from '../../features/share/types';
import AppText from '../ui/AppText';

type Props = {
  model: ShareModel;
};

export default function ShareTemplateA({ model }: Props) {
  return (
    <View className="aspect-[9/16] w-full rounded-[28px] bg-black px-7 py-8">
      <View className="flex-1 justify-between">
        <View className="gap-4">
          <AppText variant="caption" color="inverse" className="text-[#D9D9D4] tracking-[1px]">
            {model.focusLabel}
          </AppText>
          <AppText
            variant="hero"
            color="inverse"
            className="text-[36px] leading-[40px] tracking-[-0.8px]"
            numberOfLines={3}
          >
            {model.title}
          </AppText>
        </View>

        <View className="gap-4">
          <AppText variant="body" color="inverse" className="max-w-[240px]" numberOfLines={3}>
            {model.caption}
          </AppText>
          <View className="gap-2">
            <AppText variant="bodySmall" color="inverse" className="text-[#D9D9D4]">
              {model.rankLabel}
            </AppText>
            <AppText variant="caption" color="inverse" className="text-[#D9D9D4]">
              {model.dateLabel}
            </AppText>
          </View>
        </View>
      </View>
    </View>
  );
}
