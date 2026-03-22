import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { setTemporaryAccessToken } from '../../src/api/auth';
import AppText from '../../src/components/ui/AppText';

export default function SignInScreen() {
  return (
    <View className="flex-1 bg-white px-6 pt-24">
      <AppText variant="title">로그인</AppText>
      <AppText variant="body" className="mt-3">
        이메일 로그인 플로우는 다음 단계에서 연결합니다.
      </AppText>

      <Pressable
        className="mt-10 rounded-2xl border border-black px-5 py-4"
        onPress={async () => {
          await setTemporaryAccessToken();
          router.replace('/(tabs)/session');
        }}
      >
        <AppText variant="button">임시 진입</AppText>
      </Pressable>
    </View>
  );
}
