import { useLocalSearchParams } from 'expo-router';
import HighlightCreateScreen from '../../src/features/highlight/screens/HighlightCreateScreen';

export default function HighlightCreateRoute() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  return <HighlightCreateScreen sessionId={sessionId ?? ''} />;
}
