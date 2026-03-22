import { useLocalSearchParams } from 'expo-router';
import HighlightCreateScreen from '../../src/features/highlight/screens/HighlightCreateScreen';

export default function HighlightCreateRoute() {
  const { sessionId, sessionTitle, actualMinutes, completedAt } =
    useLocalSearchParams<{
      sessionId: string;
      sessionTitle: string;
      actualMinutes: string;
      completedAt: string;
    }>();
  return (
    <HighlightCreateScreen
      sessionId={sessionId}
      sessionTitle={sessionTitle}
      actualMinutes={Number(actualMinutes)}
      completedAt={completedAt}
    />
  );
}
