import { View } from 'react-native';
import AppText from '../../../src/components/ui/AppText';

export default function ArchiveHome() {
  return (
    <View className="flex-1 bg-white px-6 pt-20">
      <AppText variant="title">아카이브</AppText>
      <AppText variant="body" className="mt-4">
        조용히 쌓여온 흔적을 보는 공간.
      </AppText>
    </View>
  );
}
