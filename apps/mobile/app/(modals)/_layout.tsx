import { Stack } from 'expo-router';

export default function ModalsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, presentation: 'modal' }}>
      <Stack.Screen name="session-note" />
      <Stack.Screen name="blog-compose" />
      <Stack.Screen name="share-preview" />
      <Stack.Screen name="highlight-create" />
      <Stack.Screen name="highlight-session-picker" />
      <Stack.Screen name="highlight-viewer" />
      <Stack.Screen name="profile-edit" />
      <Stack.Screen name="quiz-loading" />
      <Stack.Screen name="quiz-answer" />
      <Stack.Screen name="quiz-result" />
      <Stack.Screen name="jitter" />
    </Stack>
  );
}
