import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import SessionTimer from '../../../components/session/SessionTimer';
import AppButton from '../../../components/ui/AppButton';
import AppText from '../../../components/ui/AppText';
import { routes } from '../../../constants/routes';
import { formatClock } from '../../../lib/date';
import { colors, radius, spacing } from '../../../theme/tokens';
import { ApiError } from '../../../lib/error';
import {
  useCompleteSessionMutation,
  useSessionStore,
  useUpsertSessionNoteMutation,
} from '../hooks';
import { clearSessionNoteDraft, readSessionNoteDraft, writeSessionNoteDraft } from '../utils';
import {
  useCreateQuizJobMutation,
  useSubmitQuizAttemptMutation,
  useQuizJobQuery,
  useQuizQuery,
} from '../../quiz/hooks';
import { QuizAttempt } from '../../quiz/types';

type Phase = 'active' | 'confirming' | 'done';
type QuizPhase = 'idle' | 'loading' | 'question' | 'submitting' | 'result' | 'error';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const SPRING_SHEET = { stiffness: 150, damping: 24 } as const;
const TIMING_STD = { duration: 280, easing: Easing.out(Easing.cubic) } as const;
const TIMING_FAST = { duration: 200, easing: Easing.out(Easing.cubic) } as const;

export default function SessionActiveScreen() {
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const activeSessionStartedAt = useSessionStore((s) => s.activeSessionStartedAt);
  const activeSessionPlannedMinutes = useSessionStore((s) => s.activeSessionPlannedMinutes);
  const activeSessionTopic = useSessionStore((s) => s.activeSessionTopic);
  const activeSessionSubject = useSessionStore((s) => s.activeSessionSubject);
  const pauseStartedAt = useSessionStore((s) => s.pauseStartedAt);
  const setPaused = useSessionStore((s) => s.setPaused);
  const incrementCompleted = useSessionStore((s) => s.incrementCompletedSessionCount);

  const isPaused = pauseStartedAt !== null;
  const completeMutation = useCompleteSessionMutation();

  const [phase, setPhase] = useState<Phase>('active');
  const [sheetInteractive, setSheetInteractive] = useState(false);
  const [doneSessionId, setDoneSessionId] = useState<string | null>(null);
  const [doneElapsedSeconds, setDoneElapsedSeconds] = useState(0);
  const [memo, setMemo] = useState('');
  const [draftLoaded, setDraftLoaded] = useState(false);

  const noteMutation = useUpsertSessionNoteMutation(doneSessionId ?? '');
  const autoCompleted = useRef(false);

  // ── Quiz state ───────────────────────────────────────────────────
  const [quizPhase, setQuizPhase] = useState<QuizPhase>('idle');
  const [quizJobId, setQuizJobId] = useState<string | null>(null);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [quizAttempt, setQuizAttempt] = useState<QuizAttempt | null>(null);
  const [quizError, setQuizError] = useState<string | null>(null);

  const createQuizJobMutation = useCreateQuizJobMutation();
  const submitQuizAttemptMutation = useSubmitQuizAttemptMutation();
  const quizJobQuery = useQuizJobQuery(quizJobId ?? '');
  const quizQuery = useQuizQuery(quizId ?? '');

  // ── Shared Values ────────────────────────────────────────────────
  const timerScale = useSharedValue(1);
  const pausedLabelOpacity = useSharedValue(0);
  const sheetTranslateY = useSharedValue(SCREEN_HEIGHT);
  const overlayOpacity = useSharedValue(0);
  const doneOpacity = useSharedValue(0);
  const doneSlideY = useSharedValue(24);

  // ── Animated Styles ──────────────────────────────────────────────
  const timerScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: timerScale.value }],
  }));

  const pausedLabelStyle = useAnimatedStyle(() => ({
    opacity: pausedLabelOpacity.value,
  }));

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  const doneContentStyle = useAnimatedStyle(() => ({
    opacity: doneOpacity.value,
    transform: [{ translateY: doneSlideY.value }],
  }));

  // ── Effects ──────────────────────────────────────────────────────

  // Load draft note
  useEffect(() => {
    if (!activeSessionId || draftLoaded) return;
    readSessionNoteDraft(activeSessionId)
      .then((draft) => {
        if (draft?.summary) setMemo(draft.summary);
        setDraftLoaded(true);
      })
      .catch(() => setDraftLoaded(true));
  }, [activeSessionId, draftLoaded]);

  // PAUSED label fade
  useEffect(() => {
    pausedLabelOpacity.value = withTiming(isPaused ? 1 : 0, TIMING_FAST);
  }, [isPaused, pausedLabelOpacity]);

  // Done phase: slide-up + fade-in
  useEffect(() => {
    if (phase !== 'done') return;
    doneOpacity.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) });
    doneSlideY.value = withTiming(0, { duration: 350, easing: Easing.out(Easing.cubic) });
  }, [phase, doneOpacity, doneSlideY]);

  // Quiz job polling → transition to question
  useEffect(() => {
    if (quizPhase !== 'loading') return;
    const job = quizJobQuery.data?.job;
    if (!job) return;
    if (job.status === 'done' && job.quizId) {
      setQuizId(job.quizId);
    } else if (job.status === 'failed') {
      setQuizError('Quiz generation failed. Try again.');
      setQuizPhase('error');
    }
  }, [quizPhase, quizJobQuery.data]);

  // Quiz loaded → show question
  useEffect(() => {
    if (quizPhase !== 'loading') return;
    const questions = quizQuery.data?.quiz.questions;
    if (questions && questions.length > 0) {
      setCurrentQuestionIndex(0);
      setAnswers([]);
      setCurrentAnswer('');
      setQuizPhase('question');
    }
  }, [quizPhase, quizQuery.data]);

  // ── Guard ────────────────────────────────────────────────────────
  if (
    phase === 'active' &&
    (!activeSessionId || !activeSessionStartedAt || !activeSessionPlannedMinutes || !activeSessionTopic)
  ) {
    return (
      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: spacing['2xl'] }}>
          <AppText variant="body">No active session.</AppText>
          <AppButton label="Back to Sessions" onPress={() => router.replace(routes.sessionHome)} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Handlers ─────────────────────────────────────────────────────

  const openConfirming = () => {
    setPhase('confirming');
    setSheetInteractive(true);
    sheetTranslateY.value = withSpring(0, SPRING_SHEET);
    overlayOpacity.value = withTiming(0.45, TIMING_STD);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const closeConfirming = () => {
    setSheetInteractive(false);
    sheetTranslateY.value = withTiming(SCREEN_HEIGHT, TIMING_STD, (finished) => {
      if (finished) runOnJS(setPhase)('active');
    });
    overlayOpacity.value = withTiming(0, TIMING_STD);
  };

  const handleTogglePause = () => {
    setPaused(isPaused ? null : new Date().toISOString());
    Haptics.selectionAsync();
  };

  const handleTimerExpire = () => {
    if (autoCompleted.current) return;
    autoCompleted.current = true;
    openConfirming();
  };

  const doComplete = async (sessionId: string, startedAt: string) => {
    const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);

    let sessionId_: string;
    try {
      const response = await completeMutation.mutateAsync(sessionId);
      sessionId_ = response.session.id;
    } catch (err) {
      if (err instanceof ApiError && err.code === 'SESSION_ALREADY_FINISHED') {
        // onError in mutation already cleared the store.
        // sheet를 즉시 언마운트하고 세션 홈으로 이동
        setPhase('done');
        router.replace(routes.sessionHome);
        return;
      }
      throw err;
    }

    incrementCompleted();
    setDoneSessionId(sessionId_);
    setDoneElapsedSeconds(elapsed);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Pulse → transition to done via animation callback
    timerScale.value = withSequence(
      withTiming(1.03, { duration: 200, easing: Easing.out(Easing.cubic) }),
      withTiming(1.0, { duration: 200, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(setPhase)('done');
      })
    );

    setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 400);

    // TODO: trigger quiz job in background (POST /v1/quizzes/jobs)
    // quizJobMutation.mutate(response.session.id);
  };

  const handleConfirmEnd = async () => {
    if (!activeSessionId || !activeSessionStartedAt) return;

    // 터치 즉시 비활성화 → overlay/sheet가 더 이상 입력을 막지 않음
    setSheetInteractive(false);

    // Slide sheet down immediately
    sheetTranslateY.value = withTiming(SCREEN_HEIGHT, TIMING_STD);
    overlayOpacity.value = withTiming(0, TIMING_FAST);

    if (memo.trim().length > 0) {
      await writeSessionNoteDraft(activeSessionId, { summary: memo, insight: '' });
    }
    await doComplete(activeSessionId, activeSessionStartedAt);
  };

  const handleReflect = async () => {
    if (!doneSessionId || quizPhase !== 'idle') return;
    setQuizPhase('loading');
    setQuizError(null);
    try {
      const response = await createQuizJobMutation.mutateAsync(doneSessionId);
      setQuizJobId(response.job.id);
    } catch {
      setQuizError('Could not start quiz. Try again.');
      setQuizPhase('error');
    }
  };

  const handleNextQuestion = () => {
    const questions = quizQuery.data?.quiz.questions ?? [];
    const updatedAnswers = [...answers, currentAnswer];
    if (currentQuestionIndex + 1 < questions.length) {
      setAnswers(updatedAnswers);
      setCurrentAnswer('');
      setCurrentQuestionIndex((i) => i + 1);
    } else {
      void handleSubmitQuiz(updatedAnswers);
    }
  };

  const handleSubmitQuiz = async (finalAnswers: string[]) => {
    if (!quizId) return;
    setQuizPhase('submitting');
    try {
      const attempt = await submitQuizAttemptMutation.mutateAsync({ quizId, answers: finalAnswers });
      setQuizAttempt(attempt.attempt);
      setQuizPhase('result');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setQuizError('Could not submit quiz. Try again.');
      setQuizPhase('error');
    }
  };

  const handleArchive = async () => {
    if (!doneSessionId) return;
    if (memo.trim().length > 0) {
      await noteMutation.mutateAsync({ summary: memo, insight: '' });
      await clearSessionNoteDraft(doneSessionId);
    }
    const score = quizAttempt?.totalScore ?? null;
    router.push(routes.sharePreviewModal(doneSessionId, score ?? undefined));
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
    <SafeAreaView
      style={[styles.fill, { backgroundColor: phase === 'done' ? colors.bg.primary : colors.bg.secondary }]}
      edges={['top', 'bottom']}
    >
      {/* ── ACTIVE / CONFIRMING phase ── */}
      {phase !== 'done' && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing['3xl'] }}>
          {activeSessionSubject ? (
            <AppText variant="caption" style={{ color: colors.text.tertiary, letterSpacing: 0.5, marginBottom: 4 }}>
              {activeSessionSubject}
            </AppText>
          ) : null}

          <AppText
            variant="title"
            style={{ textAlign: 'center', fontSize: 18, marginBottom: spacing.xl }}
            numberOfLines={2}
          >
            {activeSessionTopic}
          </AppText>

          {/* Timer with pulse wrapper */}
          <Animated.View style={timerScaleStyle}>
            <SessionTimer
              startedAt={activeSessionStartedAt!}
              plannedMinutes={activeSessionPlannedMinutes!}
              paused={isPaused || phase === 'confirming'}
              mode="elapsed"
              onExpire={handleTimerExpire}
            />
          </Animated.View>

          {/* PAUSED label */}
          <Animated.View style={[{ marginTop: spacing.xs }, pausedLabelStyle]}>
            <AppText variant="caption" style={{ color: colors.text.tertiary, letterSpacing: 1.5, fontSize: 11 }}>
              PAUSED
            </AppText>
          </Animated.View>

          {/* Controls */}
          <View style={{ marginTop: spacing['3xl'], width: '100%', flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <AppButton
                label={isPaused ? 'Resume' : 'Pause'}
                variant={isPaused ? 'primary' : 'ghost'}
                disabled={completeMutation.isPending}
                onPress={handleTogglePause}
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppButton
                label={completeMutation.isPending ? 'Ending...' : 'End Session'}
                variant={isPaused ? 'ghost' : 'primary'}
                disabled={completeMutation.isPending}
                onPress={openConfirming}
              />
            </View>
          </View>
        </View>
      )}

      {/* ── DONE phase ── */}
      {phase === 'done' && (
        <Animated.View style={[{ flex: 1 }, doneContentStyle]}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: spacing['3xl'],
              paddingTop: 56,
              paddingBottom: 48,
            }}
          >
            {/* Elapsed time */}
            <View style={{ alignItems: 'center', marginBottom: 6 }}>
              <AppText variant="hero" style={{ fontSize: 64, lineHeight: 72, letterSpacing: -1 }}>
                {formatClock(doneElapsedSeconds)}
              </AppText>
            </View>

            {/* Topic */}
            <AppText
              variant="caption"
              style={{ color: colors.text.tertiary, textAlign: 'center', marginBottom: 40, letterSpacing: 0.5 }}
            >
              {activeSessionTopic ?? ''}
            </AppText>

            {/* Note — read-only */}
            {memo.trim().length > 0 && (
              <Animated.View entering={FadeIn.duration(300)} style={{ marginBottom: spacing['2xl'] }}>
                <AppText
                  variant="caption"
                  style={{ color: colors.text.tertiary, letterSpacing: 0.8, marginBottom: 10, fontSize: 11 }}
                >
                  NOTE
                </AppText>
                <View style={{ borderWidth: 1, borderColor: colors.line.secondary, padding: spacing.lg }}>
                  <AppText variant="bodySmall" style={{ color: colors.text.primary, lineHeight: 22 }}>
                    {memo}
                  </AppText>
                </View>
              </Animated.View>
            )}

            {/* ── Inline Quiz ── */}
            {quizPhase === 'idle' && (
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <AppButton
                    label="AI Check"
                    variant="ghost"
                    onPress={() => { void handleReflect(); }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <AppButton
                    label={noteMutation.isPending ? 'Saving...' : 'Archive'}
                    disabled={noteMutation.isPending}
                    onPress={() => { void handleArchive(); }}
                  />
                </View>
              </View>
            )}

            {quizPhase === 'loading' && (
              <View style={{ gap: spacing.xs, paddingTop: spacing.md }}>
                <AppText variant="caption" style={{ color: colors.text.tertiary, letterSpacing: 0.8 }}>
                  Generating quiz...
                </AppText>
              </View>
            )}

            {quizPhase === 'question' && (() => {
              const questions = quizQuery.data?.quiz.questions ?? [];
              const q = questions[currentQuestionIndex];
              if (!q) return null;
              return (
                <View style={{ gap: spacing.lg }}>
                  <AppText variant="caption" style={{ color: colors.text.tertiary, letterSpacing: 0.8, fontSize: 11 }}>
                    {currentQuestionIndex + 1} / {questions.length}
                  </AppText>
                  <AppText variant="body" style={{ lineHeight: 24 }}>
                    {q.promptText}
                  </AppText>
                  <TextInput
                    value={currentAnswer}
                    onChangeText={setCurrentAnswer}
                    placeholder="Your answer"
                    placeholderTextColor={colors.text.tertiary}
                    multiline
                    style={{
                      fontSize: 15,
                      lineHeight: 24,
                      color: colors.text.primary,
                      borderWidth: 1,
                      borderColor: colors.line.secondary,
                      padding: spacing.md,
                      minHeight: 80,
                      textAlignVertical: 'top',
                    }}
                  />
                  <AppButton
                    label={currentQuestionIndex + 1 < questions.length ? 'Next' : 'Submit'}
                    disabled={currentAnswer.trim().length === 0}
                    onPress={handleNextQuestion}
                  />
                </View>
              );
            })()}

            {quizPhase === 'submitting' && (
              <View style={{ gap: spacing.xs, paddingTop: spacing.md }}>
                <AppText variant="caption" style={{ color: colors.text.tertiary, letterSpacing: 0.8 }}>
                  Evaluating...
                </AppText>
              </View>
            )}

            {quizPhase === 'result' && quizAttempt && (
              <Animated.View entering={FadeIn.duration(300)} style={{ gap: spacing.lg }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs }}>
                  <AppText variant="hero" style={{ fontSize: 48, lineHeight: 56, letterSpacing: -0.5 }}>
                    {quizAttempt.totalScore}
                  </AppText>
                  <AppText variant="caption" style={{ color: colors.text.tertiary }}>
                    / {quizAttempt.questionGrades.reduce((s, g) => s + g.maxScore, 0)}
                  </AppText>
                </View>
                {quizAttempt.overallFeedback ? (
                  <AppText variant="bodySmall" style={{ color: colors.text.secondary, lineHeight: 22 }}>
                    {quizAttempt.overallFeedback}
                  </AppText>
                ) : null}
                <AppButton
                  label={noteMutation.isPending ? 'Saving...' : 'Archive'}
                  disabled={noteMutation.isPending}
                  onPress={() => { void handleArchive(); }}
                />
              </Animated.View>
            )}

            {quizPhase === 'error' && (
              <View style={{ gap: spacing.md }}>
                <AppText variant="caption" style={{ color: colors.text.tertiary }}>
                  {quizError ?? 'Something went wrong.'}
                </AppText>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <AppButton
                      label="Try again"
                      variant="ghost"
                      onPress={() => { setQuizPhase('idle'); setQuizJobId(null); setQuizId(null); }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppButton
                      label={noteMutation.isPending ? 'Saving...' : 'Archive'}
                      disabled={noteMutation.isPending}
                      onPress={() => { void handleArchive(); }}
                    />
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      )}

      {/* ── Confirming overlay + sheet (done phase에서는 언마운트) ── */}
      {phase !== 'done' && (
        <>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: colors.text.primary, pointerEvents: sheetInteractive ? 'auto' : 'none' },
              overlayAnimatedStyle,
            ]}
          />

          <Animated.View
            style={[styles.sheet, { pointerEvents: sheetInteractive ? 'auto' : 'none' }, sheetAnimatedStyle]}
          >
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
              <AppText
                variant="caption"
                style={{ color: colors.text.tertiary, letterSpacing: 1, fontSize: 11, marginBottom: spacing.xl }}
              >
                END SESSION
              </AppText>

              <TextInput
                value={memo}
                onChangeText={setMemo}
                placeholder="What stayed with you?"
                placeholderTextColor={colors.text.tertiary}
                multiline
                style={{
                  fontSize: 16,
                  lineHeight: 26,
                  color: colors.text.primary,
                  minHeight: 72,
                  marginBottom: spacing['2xl'],
                  textAlignVertical: 'top',
                }}
              />

              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <AppButton
                    label="Continue"
                    variant="ghost"
                    disabled={completeMutation.isPending}
                    onPress={closeConfirming}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <AppButton
                    label={completeMutation.isPending ? 'Ending...' : 'End'}
                    disabled={completeMutation.isPending}
                    onPress={() => { void handleConfirmEnd(); }}
                  />
                </View>
              </View>
            </KeyboardAvoidingView>
          </Animated.View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.bg.primary,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing['2xl'],
    paddingBottom: spacing['5xl'],
  },
});
