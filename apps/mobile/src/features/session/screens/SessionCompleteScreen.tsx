import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppButton from '../../../components/ui/AppButton';
import AppText from '../../../components/ui/AppText';
import { routes } from '../../../constants/routes';
import { useSessionDetailQuery, useSessionStore, useUpsertSessionNoteMutation } from '../hooks';
import { clearSessionNoteDraft, readSessionNoteDraft } from '../utils';

// Quiz phase state machine
type QuizPhase = 'idle' | 'generating' | 'question' | 'submitting' | 'result';

export default function SessionCompleteScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const detailQuery = useSessionDetailQuery(sessionId ?? '');
  const noteMutation = useUpsertSessionNoteMutation(sessionId ?? '');
  const plannedSessionCount = useSessionStore((state) => state.plannedSessionCount);
  const completedSessionCount = useSessionStore((state) => state.completedSessionCount);

  const [memo, setMemo] = useState('');
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [quizPhase, setQuizPhase] = useState<QuizPhase>('idle');
  const [quizAnswer, setQuizAnswer] = useState('');
  // TODO: replace with real quiz data from API
  const mockQuestion = '이번 세션에서 가장 인상 깊었던 내용은 무엇이었나요?';
  const mockScore = 82;
  const mockFeedback = '핵심 내용을 잘 포착했습니다.';

  // Pre-fill memo from draft saved during active session
  useEffect(() => {
    if (!sessionId || draftLoaded) return;
    readSessionNoteDraft(sessionId)
      .then((draft) => {
        if (draft?.summary) setMemo(draft.summary);
        setDraftLoaded(true);
      })
      .catch(() => setDraftLoaded(true));
  }, [sessionId, draftLoaded]);

  const session = detailQuery.data?.session;
  const hasMoreSessions = completedSessionCount < plannedSessionCount;

  const saveNoteAndNavigate = async (destination: 'share' | 'nextSession') => {
    if (sessionId && memo.trim().length > 0) {
      await noteMutation.mutateAsync({ summary: memo, insight: '' });
      await clearSessionNoteDraft(sessionId);
    }
    if (destination === 'share') {
      router.push({ pathname: routes.sharePreviewModal, params: { sessionId } });
    } else {
      router.replace(routes.sessionHome);
    }
  };

  const handleLetsCheck = () => {
    // TODO: call POST /v1/quizzes/jobs and poll for result
    setQuizPhase('generating');
    setTimeout(() => {
      setQuizPhase('question');
    }, 1500);
  };

  const handleSubmitAnswer = () => {
    setQuizPhase('submitting');
    setTimeout(() => {
      setQuizPhase('result');
    }, 1200);
  };

  if (!sessionId) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
        <View style={{ flex: 1, padding: 32 }}>
          <AppText variant="body">Session not found.</AppText>
        </View>
      </SafeAreaView>
    );
  }

  const actualMinutes = session?.actualMinutes ?? session?.plannedMinutes ?? 0;
  const mins = String(Math.floor(actualMinutes)).padStart(2, '0');
  const secs = '00';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 32, paddingTop: 48, paddingBottom: 48 }}
      >
        {/* Completed time */}
        <View style={{ alignItems: 'center', marginBottom: 12 }}>
          <AppText
            variant="hero"
            style={{ fontSize: 72, lineHeight: 80, letterSpacing: -1, color: '#000' }}
          >
            {mins} : {secs}
          </AppText>
        </View>

        {/* Topic */}
        <AppText
          variant="caption"
          style={{ color: '#aaa', textAlign: 'center', marginBottom: 32, fontSize: 13, letterSpacing: 0.5 }}
        >
          {session?.topic ?? ''}
        </AppText>

        {/* Memo textarea */}
        <TextInput
          value={memo}
          onChangeText={setMemo}
          placeholder="지금 떠오르는 생각을 적어보세요."
          placeholderTextColor="#ccc"
          multiline
          style={{
            minHeight: 120,
            borderWidth: 1,
            borderColor: '#D9D9D4',
            padding: 16,
            fontSize: 14,
            lineHeight: 22,
            color: '#000',
            textAlignVertical: 'top',
            marginBottom: 32,
          }}
        />

        {/* Quiz section */}
        {quizPhase === 'idle' && (
          <View style={{ gap: 12 }}>
            <AppButton
              label={noteMutation.isPending ? 'Saving...' : 'Save & Archive'}
              disabled={noteMutation.isPending}
              onPress={() => saveNoteAndNavigate('share')}
            />
            <AppButton
              label="Reflect"
              variant="secondary"
              onPress={handleLetsCheck}
            />
            {hasMoreSessions && (
              <AppButton
                label={`Next Session (${completedSessionCount}/${plannedSessionCount})`}
                variant="ghost"
                onPress={() => saveNoteAndNavigate('nextSession')}
              />
            )}
          </View>
        )}

        {quizPhase === 'generating' && (
          <View style={{ alignItems: 'center', gap: 12, paddingVertical: 24 }}>
            <ActivityIndicator color="#000" />
            <AppText variant="bodySmall" style={{ color: '#888' }}>
              Generating reflection prompt...
            </AppText>
          </View>
        )}

        {quizPhase === 'question' && (
          <View style={{ gap: 16 }}>
            <AppText variant="caption" style={{ color: '#8A8A84', letterSpacing: 1 }}>
              REFLECT
            </AppText>
            <AppText variant="body" style={{ lineHeight: 24 }}>
              {mockQuestion}
            </AppText>
            <TextInput
              value={quizAnswer}
              onChangeText={setQuizAnswer}
              placeholder="답변을 적어보세요."
              placeholderTextColor="#ccc"
              multiline
              style={{
                minHeight: 100,
                borderWidth: 1,
                borderColor: '#D9D9D4',
                padding: 16,
                fontSize: 14,
                lineHeight: 22,
                color: '#000',
                textAlignVertical: 'top',
              }}
            />
            <AppButton
              label="제출"
              disabled={quizAnswer.trim().length === 0}
              onPress={handleSubmitAnswer}
            />
          </View>
        )}

        {quizPhase === 'submitting' && (
          <View style={{ alignItems: 'center', gap: 12, paddingVertical: 24 }}>
            <ActivityIndicator color="#000" />
            <AppText variant="bodySmall" style={{ color: '#888' }}>
              Scoring...
            </AppText>
          </View>
        )}

        {quizPhase === 'result' && (
          <View style={{ gap: 16 }}>
            <View
              style={{
                borderWidth: 1,
                borderColor: '#D9D9D4',
                padding: 20,
                gap: 8,
              }}
            >
              <AppText variant="caption" style={{ color: '#8A8A84', letterSpacing: 0.8 }}>
                Score
              </AppText>
              <AppText
                variant="hero"
                style={{ fontSize: 48, lineHeight: 56, letterSpacing: -0.5 }}
              >
                {mockScore}
              </AppText>
              <AppText variant="bodySmall" style={{ color: '#555' }}>
                {mockFeedback}
              </AppText>
            </View>
            <AppButton
              label={noteMutation.isPending ? 'Saving...' : 'Save & Archive'}
              disabled={noteMutation.isPending}
              onPress={() => saveNoteAndNavigate('share')}
            />
            {hasMoreSessions && (
              <AppButton
                label={`Next Session (${completedSessionCount}/${plannedSessionCount})`}
                variant="ghost"
                onPress={() => saveNoteAndNavigate('nextSession')}
              />
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
