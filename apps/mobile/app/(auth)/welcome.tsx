import { router } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppButton from '../../src/components/ui/AppButton';
import AppText from '../../src/components/ui/AppText';

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
      <View style={{ flex: 1, paddingHorizontal: 32, justifyContent: 'center' }}>
        {/* Copy */}
        <View style={{ marginBottom: 64 }}>
          <AppText
            variant="hero"
            style={{ fontSize: 36, lineHeight: 42, letterSpacing: -1, color: '#111', marginBottom: 20 }}
          >
            NichE
          </AppText>
          <AppText variant="body" style={{ color: '#555', lineHeight: 26 }}>
            Dive deep into your taste.{'\n'}Archive it. Share it.
          </AppText>
        </View>

        {/* CTA */}
        <View style={{ gap: 12 }}>
          <AppButton
            label="이메일로 시작하기"
            onPress={() => router.push('/(auth)/sign-in')}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
