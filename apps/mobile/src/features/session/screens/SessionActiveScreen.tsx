import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SessionTimer from '../../../components/session/SessionTimer';
import AppButton from '../../../components/ui/AppButton';
import AppText from '../../../components/ui/AppText';
import { routes } from '../../../constants/routes';
import { formatClock } from '../../../lib/date';
import {
  useCompleteSessionMutation,
  useSessionStore,
  useUpsertSessionNoteMutation,
} from '../hooks';
import {
  clearSessionNoteDraft,
  readSessionNoteDraft,
  writeSessionNoteDraft,
} from '../utils';

type Phase = 'active' | 'done';
// TODO: wire 'question' → real API (POST /v1/quizzes/jobs → poll → GET quiz → POST attempt)
type QuizPhase = 'idle' | 'question' | 'result';

export default function SessionActiveScreen() {
  const activeSessionId = useSessionStore((state) => state.activeSessionId);
  const activeSessionStartedAt = useSessionStore((state) => state.activeSessionStartedAt);
  const activeSessionPlannedMinutes = useSessionStore((state) => state.activeSessionPlannedMinutes);
  const activeSessionTopic = useSessionStore((state) => state.activeSessionTopic);
  const activeSessionSubject = useSessionStore((state) => state.activeSessionSubject);
  const pauseStartedAt = useSessionStore((state) => state.pauseStartedAt);
  const setPaused = useSessionStore((state) => state.setPaused);
  const incrementCompleted = useSessionStore((state) => state.incrementCompletedSessionCount);

  const isPaused = pauseStartedAt !== null;

  const completeMutation = useCompleteSessionMutation();

  const [phase, setPhase] = useState<Phase>('active');
  const [doneSessionId, setDoneSessionId] = useState<string | null>(null);
  const [doneElapsedSeconds, setDoneElapsedSeconds] = useState(0);

  const [memo, setMemo] = useState('');
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [quizPhase, setQuizPhase] = useState<QuizPhase>('idle');
  const [quizAnswer, setQuizAnswer] = useState('');
  // TODO: replace stubs with real API response values
  const stubScore = 70;
  const stubFeedback = '핵심 내용을 잘 포착했습니다. 한 문장으로 정리하는 습관이 좋네요.';

  const noteMutation = useUpsertSessionNoteMutation(doneSessionId ?? '');
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoCompleted = useRef(false);

  // Pre-load draft note written during session
  useEffect(() => {
    if (!activeSessionId || draftLoaded) return;
    readSessionNoteDraft(activeSessionId)
      .then((draft) => {
        if (draft?.summary) setMemo(draft.summary);
        setDraftLoaded(true);
      })
      .catch(() => setDraftLoaded(true));
  }, [activeSessionId, draftLoaded]);

  // Auto-save memo draft (active phase only)
  useEffect(() => {
    if (!activeSessionId || phase !== 'active') return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      void writeSessionNoteDraft(activeSessionId, { summary: memo, insight: '' });
    }, 800);
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [memo, activeSessionId, phase]);

  if (phase !== 'done' && (!activeSessionId || !activeSessionStartedAt || !activeSessionPlannedMinutes || !activeSessionTopic)) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
          <AppText variant="body">진행 중인 세션이 없습니다.</AppText>
          <AppButton label="세션으로" onPress={() => router.replace(routes.sessionHome)} />
        </View>
      </SafeAreaView>
    );
  }

  const doComplete = async (sessionId: string, startedAt: string) => {
    const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
    const response = await completeMutation.mutateAsync(sessionId);
    incrementCompleted();
    setDoneSessionId(response.session.id);
    setDoneElapsedSeconds(elapsed);
    setPhase('done');
  };

  const handleTogglePause = () => {
    setPaused(isPaused ? null : new Date().toISOString());
  };

  const handleComplete = () => {
    Alert.alert('세션을 종료할까요?', '지금까지의 집중 시간이 기록됩니다.', [
      { text: '계속하기', style: 'cancel' },
      {
        text: '종료',
        onPress: async () => {
          if (!activeSessionId || !activeSessionStartedAt) return;
          if (memo.trim().length > 0) {
            await writeSessionNoteDraft(activeSessionId, { summary: memo, insight: '' });
          }
          await doComplete(activeSessionId, activeSessionStartedAt);
        },
      },
    ]);
  };

  const handleTimerExpire = async () => {
    if (autoCompleted.current || !activeSessionId || !activeSessionStartedAt) return;
    autoCompleted.current = true;
    if (memo.trim().length > 0) {
      await writeSessionNoteDraft(activeSessionId, { summary: memo, insight: '' });
    }
    await doComplete(activeSessionId, activeSessionStartedAt);
  };

  const handleArchive = async () => {
    if (!doneSessionId) return;
    if (memo.trim().length > 0) {
      await noteMutation.mutateAsync({ summary: memo, insight: '' });
      await clearSessionNoteDraft(doneSessionId);
    }
    router.push({ pathname: routes.sharePreviewModal, params: { sessionId: doneSessionId } });
  };

  // ── DONE phase ────────────────────────────────────────────────────────────
  if (phase === 'done') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 32, paddingTop: 56, paddingBottom: 48 }}
        >
          {/* Final elapsed time */}
          <View style={{ alignItems: 'center', marginBottom: 6 }}>
            <AppText
              variant="hero"
              style={{ fontSize: 64, lineHeight: 72, letterSpacing: -1, color: '#000' }}
            >
              {formatClock(doneElapsedSeconds)}
            </AppText>
          </View>

          {/* Topic */}
          <AppText
            variant="caption"
            style={{ color: '#aaa', textAlign: 'center', marginBottom: 40, fontSize: 12 }}
          >
            {activeSessionTopic ?? ''}
          </AppText>

          {/* Note area (shown when quiz is idle) */}
          {quizPhase === 'idle' && (
            <View style={{ marginBottom: 28 }}>
              <AppText
                variant="caption"
                style={{ color: '#888', letterSpacing: 0.8, marginBottom: 10, fontSize: 11 }}
              >
                NOTE
              </AppText>
              <TextInput
                value={memo}
                onChangeText={setMemo}
                placeholder="In a few sentences — what stayed with you?"
                placeholderTextColor="#ccc"
                multiline
                style={{
                  height: 96,
                  borderWidth: 1,
                  borderColor: '#d0d0d0',
                  padding: 14,
                  fontSize: 14,
                  lineHeight: 22,
                  color: '#000',
                  textAlignVertical: 'top',
                }}
              />
            </View>
          )}

          {/* Quiz — question */}
          {quizPhase === 'question' && (
            <View style={{ marginBottom: 28, gap: 14 }}>
              <AppText
                variant="caption"
                style={{ color: '#8A8A84', letterSpacing: 1, fontSize: 11 }}
              >
                REFLECT
              </AppText>
              <View style={{ borderWidth: 1, borderColor: '#D9D9D4', padding: 16 }}>
                <AppText variant="bodySmall" style={{ color: '#111', lineHeight: 22 }}>
                  {/* TODO: replace with real question from POST /v1/quizzes/jobs */}
                  이번 세션에서 가장 인상 깊었던 내용은 무엇이었나요?
                </AppText>
              </View>
              <TextInput
                value={quizAnswer}
                onChangeText={setQuizAnswer}
                placeholder="답변을 적어보세요..."
                placeholderTextColor="#ccc"
                multiline
                style={{
                  height: 88,
                  borderWidth: 1,
                  borderColor: '#D9D9D4',
                  padding: 14,
                  fontSize: 14,
                  lineHeight: 22,
                  color: '#111',
                  textAlignVertical: 'top',
                }}
              />
              <AppButton
                label="제출"
                disabled={quizAnswer.trim().length === 0}
                onPress={() => setQuizPhase('result')}
              />
            </View>
          )}

          {/* Quiz — result */}
          {quizPhase === 'result' && (
            <View style={{ marginBottom: 28 }}>
              <AppText
                variant="caption"
                style={{ color: '#8A8A84', letterSpacing: 1, fontSize: 11, marginBottom: 14 }}
              >
                RESULT
              </AppText>
              <View style={{ borderWidth: 1, borderColor: '#D9D9D4', padding: 20, gap: 8 }}>
                <AppText variant="caption" style={{ color: '#8A8A84', letterSpacing: 0.6 }}>
                  AI Score
                </AppText>
                <AppText
                  variant="hero"
                  style={{ fontSize: 48, lineHeight: 54, letterSpacing: -1, color: '#111' }}
                >
                  {/* TODO: replace with real score from POST /v1/quizzes/{id}/attempts */}
                  {stubScore}
                </AppText>
                <AppText variant="bodySmall" style={{ color: '#555', lineHeight: 20 }}>
                  {stubFeedback}
                </AppText>
              </View>
            </View>
          )}

          {/* Action buttons */}
          <View style={{ gap: 10 }}>
            {quizPhase === 'idle' && (
              <AppButton
                label="Let's Check"
                variant="secondary"
                onPress={() => setQuizPhase('question')}
              />
            )}
            <AppButton
              label={noteMutation.isPending ? '저장 중...' : 'Archive'}
              disabled={noteMutation.isPending}
              onPress={handleArchive}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── ACTIVE phase ──────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
      <View style={{ flex: 1 }}>
        {/* Upper — timer + controls */}
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 32,
            gap: 8,
          }}
        >
          {activeSessionSubject ? (
            <AppText variant="caption" style={{ color: '#aaa', letterSpacing: 0.5 }}>
              {activeSessionSubject}
            </AppText>
          ) : null}

          <AppText
            variant="title"
            style={{ textAlign: 'center', fontSize: 18, marginBottom: 8 }}
            numberOfLines={2}
          >
            {activeSessionTopic}
          </AppText>

          <SessionTimer
            startedAt={activeSessionStartedAt!}
            plannedMinutes={activeSessionPlannedMinutes!}
            paused={isPaused}
            mode="elapsed"
            onExpire={handleTimerExpire}
          />

          {isPaused && (
            <AppText
              variant="caption"
              style={{ color: '#bbb', letterSpacing: 1.5, fontSize: 11, marginTop: 4 }}
            >
              PAUSED
            </AppText>
          )}

          {/* Stop / Complete */}
          <View style={{ marginTop: 28, width: '100%', flexDirection: 'row', gap: 10 }}>
            <AppButton
              label={isPaused ? 'Resume' : 'Stop'}
              variant={isPaused ? 'primary' : 'ghost'}
              fullWidth={false}
              className="flex-1"
              disabled={completeMutation.isPending}
              onPress={handleTogglePause}
            />
            <AppButton
              label={completeMutation.isPending ? '종료 중...' : 'Complete'}
              variant={isPaused ? 'ghost' : 'primary'}
              fullWidth={false}
              className="flex-1"
              disabled={completeMutation.isPending}
              onPress={handleComplete}
            />
          </View>
        </View>

        {/* Divider */}
        <View style={{ height: 1, backgroundColor: '#ebebeb', marginHorizontal: 32 }} />

        {/* Note — locked until session ends */}
        <View style={{ paddingHorizontal: 32, paddingVertical: 20 }}>
          <AppText
            variant="caption"
            style={{ color: '#d0d0d0', letterSpacing: 0.8, fontSize: 11, marginBottom: 10 }}
          >
            NOTE
          </AppText>
          <View
            style={{
              height: 88,
              borderWidth: 1,
              borderColor: '#ebebeb',
              padding: 14,
              justifyContent: 'center',
            }}
          >
            <AppText variant="bodySmall" style={{ color: '#ccc' }}>
              집중이 끝나면 기록할 수 있어요.
            </AppText>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
