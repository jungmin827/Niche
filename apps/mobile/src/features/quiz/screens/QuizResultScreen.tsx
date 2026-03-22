import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppButton from '../../../components/ui/AppButton';
import AppText from '../../../components/ui/AppText';
import { useQuizAttemptQuery } from '../hooks';

export default function QuizResultScreen() {
  const { quizId, attemptId, sessionId } = useLocalSearchParams<{
    quizId: string;
    attemptId: string;
    sessionId?: string;
  }>();
  const attemptQuery = useQuizAttemptQuery(quizId ?? '', attemptId ?? '');

  const attempt = attemptQuery.data;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#D9D9D4',
        }}
      >
        <View style={{ flexDirection: 'row', gap: 20, alignItems: 'center' }}>
          {sessionId ? (
            <Pressable
              onPress={() =>
                router.replace({
                  pathname: '/(modals)/share-preview',
                  params: {
                    sessionId,
                    quizScore: attempt?.totalScore?.toString() ?? '',
                  },
                })
              }
              hitSlop={8}
            >
              <AppText variant="bodySmall">Export</AppText>
            </Pressable>
          ) : null}
          <Pressable onPress={() => router.replace('/(tabs)/session')} hitSlop={8}>
            <AppText variant="bodySmall">Done</AppText>
          </Pressable>
        </View>
      </View>

      {attemptQuery.isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <AppText variant="bodySmall" style={{ color: '#8A8A84' }}>
            Loading results...
          </AppText>
        </View>
      ) : attemptQuery.isError || !attempt ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
          <AppText variant="bodySmall" style={{ color: '#8A8A84', textAlign: 'center' }}>
            Could not load your results.
          </AppText>
          <AppButton
            label="Back to Sessions"
            variant="secondary"
            fullWidth={false}
            onPress={() => router.replace('/(tabs)/session')}
          />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        >
          {/* Score */}
          <View style={{ alignItems: 'center', paddingVertical: 32, gap: 8 }}>
            <AppText variant="caption" style={{ color: '#8A8A84' }}>
              Score
            </AppText>
            <AppText
              variant="hero"
              style={{ fontSize: 48, fontWeight: '700', letterSpacing: -1 }}
            >
              {attempt.totalScore}
            </AppText>
          </View>

          <View style={{ height: 1, backgroundColor: '#D9D9D4', marginBottom: 24 }} />

          {/* Overall feedback */}
          {attempt.overallFeedback ? (
            <View style={{ marginBottom: 32 }}>
              <AppText variant="caption" style={{ color: '#8A8A84', marginBottom: 8 }}>
                Feedback
              </AppText>
              <AppText variant="body" style={{ lineHeight: 26, color: '#111' }}>
                {attempt.overallFeedback}
              </AppText>
            </View>
          ) : null}

          {/* Per-question grades */}
          {attempt.questionGrades.map((grade, index) => (
            <View
              key={grade.questionId}
              style={{
                borderTopWidth: 1,
                borderTopColor: '#D9D9D4',
                paddingVertical: 20,
                gap: 8,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <AppText variant="caption" style={{ color: '#8A8A84' }}>
                  Q{index + 1}
                </AppText>
                <AppText variant="caption" style={{ color: '#111' }}>
                  {grade.score} / {grade.maxScore}
                </AppText>
              </View>
              {grade.feedback ? (
                <AppText variant="bodySmall" style={{ color: '#555555', lineHeight: 22 }}>
                  {grade.feedback}
                </AppText>
              ) : null}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
