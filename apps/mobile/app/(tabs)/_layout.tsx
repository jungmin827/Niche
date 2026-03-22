import { Feather } from '@expo/vector-icons';
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
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#111111',
        tabBarInactiveTintColor: '#8A8A84',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#D9D9D4',
          borderTopWidth: 1,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
        },
        tabBarItemStyle: {
          paddingBottom: 4,
        },
      }}
    >
      <Tabs.Screen
        name="session"
        options={{
          title: 'Session',
          tabBarIcon: ({ color }) => <Feather name="clock" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color }) => <Feather name="rss" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="blog"
        options={{
          title: 'Blog',
          tabBarIcon: ({ color }) => <Feather name="edit-3" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="archive"
        options={{
          title: 'Archive',
          tabBarIcon: ({ color }) => <Feather name="archive" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
