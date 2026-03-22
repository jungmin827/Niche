import { router } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppButton from '../../src/components/ui/AppButton';
import AppText from '../../src/components/ui/AppText';

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
      <View style={{ flex: 1, paddingHorizontal: 32 }}>
        {/* Brand block — anchored to top */}
        <View style={{ paddingTop: 72 }}>
          <AppText
            variant="hero"
            style={{ fontSize: 44, lineHeight: 50, letterSpacing: -1.5, color: '#111', marginBottom: 20 }}
          >
            NichE
          </AppText>
          <View style={{ width: 28, height: 1, backgroundColor: '#111', marginBottom: 20 }} />
          <AppText variant="bodySmall" style={{ color: '#555', lineHeight: 24 }}>
            Dive deep into your taste.{'\n'}Archive it. Share it.
          </AppText>
        </View>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* CTA — anchored to bottom */}
        <View style={{ paddingBottom: 48 }}>
          <AppButton
            label="Get Started"
            onPress={() => router.push('/(auth)/sign-in')}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
