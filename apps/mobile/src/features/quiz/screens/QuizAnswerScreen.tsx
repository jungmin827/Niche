import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppText from '../../../components/ui/AppText';
import { useQuizQuery, useSubmitQuizAttemptMutation } from '../hooks';

export default function QuizAnswerScreen() {
  const { quizId } = useLocalSearchParams<{ quizId: string }>();
  const quizQuery = useQuizQuery(quizId ?? '');
  const submitMutation = useSubmitQuizAttemptMutation();

  const [answers, setAnswers] = useState<Record<number, string>>({});

  const quiz = quizQuery.data?.quiz;
  const questions = quiz?.questions ?? [];

  const allAnswered = questions.length > 0 && questions.every((q) => (answers[q.sequenceNo] ?? '').trim().length > 0);
  const isSubmitting = submitMutation.isPending;

  const handleSubmit = async () => {
    if (!quiz || !allAnswered || isSubmitting) return;

    try {
      const orderedAnswers = [...questions]
        .sort((a, b) => a.sequenceNo - b.sequenceNo)
        .map((q) => answers[q.sequenceNo] ?? '');

      const result = await submitMutation.mutateAsync({
        quizId: quiz.id,
        answers: orderedAnswers,
      });

      router.replace({
        pathname: '/(modals)/quiz-result',
        params: { quizId: quiz.id, attemptId: result.attempt.id },
      });
    } catch {
      Alert.alert('Submission failed', 'Could not submit your answers. Please try again.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#D9D9D4',
        }}
      >
        <AppText variant="caption" style={{ color: '#8A8A84' }}>
          Reflection
        </AppText>
        <Pressable onPress={handleSubmit} disabled={!allAnswered || isSubmitting} hitSlop={8}>
          <AppText
            variant="bodySmall"
            style={{ color: !allAnswered || isSubmitting ? '#8A8A84' : '#111' }}
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </AppText>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {quizQuery.isLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <AppText variant="bodySmall" style={{ color: '#8A8A84' }}>
              Loading questions...
            </AppText>
          </View>
        ) : quizQuery.isError ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <AppText variant="bodySmall" style={{ color: '#8A8A84', textAlign: 'center' }}>
              Could not load questions. Please go back and try again.
            </AppText>
          </View>
        ) : (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 32 }}
          >
            {questions.map((question) => (
              <View key={question.sequenceNo} style={{ gap: 12 }}>
                <AppText variant="caption" style={{ color: '#8A8A84' }}>
                  Q{question.sequenceNo} · {question.intentLabel}
                </AppText>
                <AppText variant="body" style={{ lineHeight: 24 }}>
                  {question.promptText}
                </AppText>
                <TextInput
                  value={answers[question.sequenceNo] ?? ''}
                  onChangeText={(text) =>
                    setAnswers((prev) => ({ ...prev, [question.sequenceNo]: text }))
                  }
                  placeholder="Write your answer..."
                  placeholderTextColor="#D9D9D4"
                  multiline
                  style={{
                    fontSize: 15,
                    lineHeight: 24,
                    color: '#111',
                    borderWidth: 1,
                    borderColor: '#D9D9D4',
                    padding: 14,
                    minHeight: 100,
                    textAlignVertical: 'top',
                  }}
                />
              </View>
            ))}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
