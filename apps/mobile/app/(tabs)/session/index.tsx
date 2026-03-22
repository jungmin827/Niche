import { View } from 'react-native';
import AppText from '../../../src/components/ui/AppText';

export default function SessionHome() {
  return (
    <View className="flex-1 bg-white px-6 pt-20">
      <AppText variant="title">세션</AppText>
      <AppText variant="body" className="mt-4">
        오늘의 첫 세션을 열어보세요.
      </AppText>
    </View>
  );
}
