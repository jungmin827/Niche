import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Image, View } from 'react-native';
import { getMyProfile } from '../src/api/profile';
import { useAuthSession } from '../src/hooks/useAuthSession';

const ICON = require('../assets/nicheicon.jpg');

export default function SplashScreen() {
  const opacity = useRef(new Animated.Value(0)).current;
  const { state } = useAuthSession();
  const navigated = useRef(false);

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  useEffect(() => {
    if (state === 'loading' || navigated.current) return;
    navigated.current = true;

    // 아이콘이 충분히 보인 후 이동
    const timer = setTimeout(async () => {
      if (state === 'authenticated') {
        try {
          const { profile } = await getMyProfile();
          if (profile.onboardingCompleted) {
            router.replace('/(tabs)/session');
          } else {
            router.replace('/(auth)/onboarding');
          }
        } catch {
          router.replace('/(tabs)/session');
        }
      } else {
        router.replace('/(auth)/welcome');
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [state]);

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ opacity }}>
        <Image
          source={ICON}
          style={{ width: 80, height: 80 }}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}
