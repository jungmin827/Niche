import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import AppText from '../../src/components/ui/AppText';

export default function WelcomeScreen() {
  return (
    <View className="flex-1 bg-white px-6 pt-24">
      <AppText variant="hero">NichE</AppText>
      <View className="mt-6">
        <AppText variant="body">
          깊은 취향을 기록하고, 남기고, 축적하는 공간.
        </AppText>
      </View>

      <Pressable
        className="mt-10 rounded-2xl bg-black px-5 py-4"
        onPress={() => router.push('/(auth)/sign-in')}
      >
        <AppText variant="button" color="inverse">
          시작하기
        </AppText>
      </Pressable>
    </View>
  );
}
