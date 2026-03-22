import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppButton from '../../../components/ui/AppButton';
import AppText from '../../../components/ui/AppText';
import { useQuizJobQuery } from '../hooks';

export default function QuizLoadingScreen() {
  const { jobId, sessionId } = useLocalSearchParams<{ jobId: string; sessionId: string }>();
  const jobQuery = useQuizJobQuery(jobId ?? '');

  const job = jobQuery.data?.job;

  useEffect(() => {
    if (!job) return;

    if (job.status === 'done' && job.quizId) {
      router.replace({
        pathname: '/(modals)/quiz-answer',
        params: { quizId: job.quizId, sessionId },
      });
    }
  }, [job, sessionId]);

  if (jobQuery.isError || job?.status === 'failed') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
          <AppText variant="title">Reflection could not be generated.</AppText>
          <AppText variant="bodySmall" style={{ color: '#8A8A84', textAlign: 'center' }}>
            Your session has been saved. You can try again later.
          </AppText>
          <AppButton
            label="Back to Sessions"
            variant="secondary"
            fullWidth={false}
            onPress={() => router.replace('/(tabs)/session')}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 }}>
        <ActivityIndicator size="large" color="#111" />
        <AppText variant="bodySmall" style={{ color: '#8A8A84' }}>
          Generating reflection questions...
        </AppText>
      </View>
    </SafeAreaView>
  );
}
