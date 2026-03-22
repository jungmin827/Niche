import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="session" options={{ title: '세션' }} />
      <Tabs.Screen name="feed" options={{ title: '홈' }} />
      <Tabs.Screen name="archive" options={{ title: '아카이브' }} />
    </Tabs>
  );
}
