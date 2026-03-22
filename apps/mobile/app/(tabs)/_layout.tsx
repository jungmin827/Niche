import { router, Tabs } from 'expo-router';
import { useEffect } from 'react';
import { useAuthSession } from '../../src/hooks/useAuthSession';

export default function TabsLayout() {
  const { state } = useAuthSession();

  // 비인증 상태로 탭에 접근하면 welcome으로 내보냄
  useEffect(() => {
    if (state === 'unauthenticated') {
      router.replace('/(auth)/welcome');
    }
  }, [state]);

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="session" options={{ title: '세션' }} />
      <Tabs.Screen name="feed" options={{ title: '홈' }} />
      <Tabs.Screen name="archive" options={{ title: '아카이브' }} />
    </Tabs>
  );
}
