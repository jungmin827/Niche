import { useLocalSearchParams } from 'expo-router';
import InterestDetailScreen from '../../../src/features/interest/screens/InterestDetailScreen';

export default function InterestDetailRoute() {
  const { interestId } = useLocalSearchParams<{ interestId: string }>();
  return <InterestDetailScreen interestId={interestId ?? ''} />;
}
