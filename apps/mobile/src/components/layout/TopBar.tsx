import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import AppText from '../ui/AppText';

type Props = {
  title: string;
  subtitle?: string;
  leadingLabel?: string;
  onLeadingPress?: () => void;
};

export default function TopBar({ title, subtitle, leadingLabel, onLeadingPress }: Props) {
  return (
    <View className="mb-8 flex-row items-start justify-between gap-4">
      <View className="flex-1 gap-3">
        <AppText variant="title" className="tracking-[0.2px]">
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="bodySmall" className="max-w-[280px] text-[#555555]">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {leadingLabel ? (
        <Pressable
          className="rounded-full border border-[#D9D9D4] bg-white px-4 py-2"
          onPress={onLeadingPress ?? (() => router.back())}
        >
          <AppText variant="bodySmall">{leadingLabel}</AppText>
        </Pressable>
      ) : null}
    </View>
  );
}
