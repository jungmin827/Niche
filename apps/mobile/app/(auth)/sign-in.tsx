import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppButton from '../../src/components/ui/AppButton';
import AppInput from '../../src/components/ui/AppInput';
import AppText from '../../src/components/ui/AppText';
import { useSessionStore } from '../../src/features/session/store';
import { supabase } from '../../src/lib/supabase';

type Mode = 'signin' | 'signup';

export default function SignInScreen() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const clearActiveSession = useSessionStore((s) => s.clearActiveSession);

  const isValid = email.trim().includes('@') && password.length >= 6;

  const handleSubmit = async () => {
    if (!supabase) {
      Alert.alert('Configuration Error', 'Supabase is not connected.');
      return;
    }

    setLoading(true);

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      setLoading(false);

      if (error) {
        Alert.alert('Sign Up Failed', error.message);
        return;
      }

      if (!data.session) {
        Alert.alert(
          'Check your email',
          `A confirmation link was sent to ${email.trim()}.\nPlease verify before signing in.`,
        );
        setMode('signin');
        return;
      }

      clearActiveSession();
      router.replace('/(tabs)/session');
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (error) {
      if (error.message.toLowerCase().includes('email not confirmed')) {
        Alert.alert('Email not verified', 'Please click the link sent to your email first.');
      } else {
        Alert.alert('Sign In Failed', error.message);
      }
      return;
    }

    if (!data.session) {
      Alert.alert('Error', 'Sign in failed. Please try again.');
      return;
    }

    clearActiveSession();
    router.replace('/(tabs)/session');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
      <View style={{ flex: 1, paddingHorizontal: 32 }}>
        {/* Header */}
        <View style={{ paddingTop: 64, marginBottom: 56 }}>
          <AppText
            variant="hero"
            style={{ fontSize: 28, lineHeight: 34, letterSpacing: -0.5, color: '#111', marginBottom: 10 }}
          >
            {mode === 'signin' ? 'Sign in' : 'Sign up'}
          </AppText>
          <AppText variant="bodySmall" style={{ color: '#8A8A84' }}>
            {mode === 'signin'
              ? 'Continue with your email and password.'
              : 'Create an account with your email.'}
          </AppText>
        </View>

        {/* Inputs */}
        <View style={{ gap: 20, marginBottom: 36 }}>
          <AppInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="name@example.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
          <AppInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="At least 6 characters"
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
        </View>

        {/* Actions */}
        <View style={{ gap: 12 }}>
          <AppButton
            label={loading ? 'Loading...' : mode === 'signin' ? 'Sign in' : 'Sign up'}
            disabled={loading || !isValid}
            onPress={handleSubmit}
          />
          <AppButton
            label={mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            variant="ghost"
            onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          />
          <AppButton
            label="Back"
            variant="ghost"
            onPress={() => router.back()}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
