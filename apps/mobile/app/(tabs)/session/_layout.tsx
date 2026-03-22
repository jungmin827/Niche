import { Stack } from 'expo-router';

export default function SessionLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="active" />
      <Stack.Screen name="complete" />
      <Stack.Screen name="[sessionId]" />
    </Stack>
  );
}
