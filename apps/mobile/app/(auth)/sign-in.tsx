import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppButton from '../../src/components/ui/AppButton';
import AppText from '../../src/components/ui/AppText';
import { supabase } from '../../src/lib/supabase';

type Mode = 'signin' | 'signup';

export default function SignInScreen() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const isValid = email.trim().includes('@') && password.length >= 6;

  const handleSubmit = async () => {
    if (!supabase) {
      Alert.alert('설정 오류', 'Supabase가 연결되지 않았습니다.');
      return;
    }

    setLoading(true);

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      setLoading(false);
      if (error) {
        Alert.alert('로그인 실패', error.message);
        return;
      }
      router.replace('/(tabs)/session');
    } else {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      setLoading(false);
      if (error) {
        Alert.alert('회원가입 실패', error.message);
        return;
      }
      router.replace('/(tabs)/session');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
      <View style={{ flex: 1, paddingHorizontal: 32, justifyContent: 'center' }}>
        {/* Header */}
        <View style={{ marginBottom: 48 }}>
          <AppText variant="hero" style={{ fontSize: 28, letterSpacing: -0.5, color: '#111', marginBottom: 8 }}>
            {mode === 'signin' ? 'Sign in' : 'Sign up'}
          </AppText>
          <AppText variant="bodySmall" style={{ color: '#8A8A84' }}>
            {mode === 'signin' ? '이메일과 비밀번호로 로그인합니다.' : '이메일과 비밀번호로 계정을 만듭니다.'}
          </AppText>
        </View>

        {/* Inputs */}
        <View style={{ gap: 16, marginBottom: 24 }}>
          <View style={{ gap: 8 }}>
            <AppText variant="caption" style={{ color: '#8A8A84', letterSpacing: 0.8 }}>
              EMAIL
            </AppText>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="name@example.com"
              placeholderTextColor="#ccc"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={{
                height: 52,
                borderWidth: 1,
                borderColor: '#D9D9D4',
                paddingHorizontal: 16,
                fontSize: 15,
                color: '#111',
              }}
            />
          </View>

          <View style={{ gap: 8 }}>
            <AppText variant="caption" style={{ color: '#8A8A84', letterSpacing: 0.8 }}>
              PASSWORD
            </AppText>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="6자 이상"
              placeholderTextColor="#ccc"
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              style={{
                height: 52,
                borderWidth: 1,
                borderColor: '#D9D9D4',
                paddingHorizontal: 16,
                fontSize: 15,
                color: '#111',
              }}
            />
          </View>
        </View>

        {/* Submit */}
        <View style={{ gap: 12 }}>
          <AppButton
            label={loading ? '처리 중...' : mode === 'signin' ? '로그인' : '가입하기'}
            disabled={loading || !isValid}
            onPress={handleSubmit}
          />

          {/* Mode toggle */}
          <AppButton
            label={mode === 'signin' ? '계정이 없으신가요? 가입하기' : '이미 계정이 있으신가요? 로그인'}
            variant="ghost"
            onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          />

          <AppButton
            label="돌아가기"
            variant="ghost"
            onPress={() => router.back()}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
