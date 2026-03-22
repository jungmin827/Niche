import { useLocalSearchParams } from 'expo-router';
import HighlightViewerScreen from '../../src/features/highlight/screens/HighlightViewerScreen';

export default function HighlightViewerRoute() {
  const { highlightId } = useLocalSearchParams<{ highlightId: string }>();
  return <HighlightViewerScreen highlightId={highlightId ?? ''} />;
}
