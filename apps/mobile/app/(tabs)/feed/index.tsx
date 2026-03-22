import { View } from 'react-native';
import AppText from '../../../src/components/ui/AppText';

export default function FeedHome() {
  return (
    <View className="flex-1 bg-white px-6 pt-20">
      <AppText variant="title">피드</AppText>
      <AppText variant="body" className="mt-4">
        비슷한 결의 기록이 모이는 공간.
      </AppText>
    </View>
  );
}
