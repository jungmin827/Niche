import { Feather } from '@expo/vector-icons';
import { router, Tabs } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthSession } from '../../src/hooks/useAuthSession';

export default function TabsLayout() {
  const { state } = useAuthSession();
  const insets = useSafeAreaInsets();

  // 비인증 상태로 탭에 접근하면 welcome으로 내보냄
  useEffect(() => {
    if (state === 'unauthenticated') {
      router.replace('/(auth)/welcome');
    }
  }, [state]);

  return (
    <View style={{ flex: 1 }}>
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
          name="interests"
          options={{
            title: 'Interests',
            tabBarIcon: ({ color }) => <Feather name="layers" size={22} color={color} />,
          }}
        />
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
      <Pressable
        onPress={() => router.push('/(modals)/jitter')}
        style={{
          position: 'absolute',
          right: 20,
          bottom: 72 + insets.bottom,
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: '#111111',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        accessibilityRole="button"
        accessibilityLabel="Jitter 열기"
      >
        <Feather name="message-circle" size={22} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}
