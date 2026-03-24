import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  DimensionValue,
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
  FadeInDown,
  FadeOut,
  ZoomIn,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Circle, Svg } from 'react-native-svg';

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

// ── Motion constants ─────────────────────────────────────────────────────────
const TIMING_STD = { duration: 280, easing: Easing.out(Easing.cubic) } as const;
const TIMING_FAST = { duration: 200, easing: Easing.out(Easing.cubic) } as const;
const SPRING_SHEET = { stiffness: 150, damping: 24 } as const;

// ── Circular timer ring constants ─────────────────────────────────────────────
const RING_SIZE = 224;
const STROKE_WIDTH = 1.5;
const RING_R = (RING_SIZE - STROKE_WIDTH) / 2;
const RING_CX = RING_SIZE / 2;
const RING_CY = RING_SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RING_R;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ── ShimmerBlock ──────────────────────────────────────────────────────────────
function ShimmerBlock({ height = 16, width = '100%', borderRadius = 3 }: {
  height?: number;
  width?: DimensionValue;
  borderRadius?: number;
}) {
  const sweepX = useSharedValue(-180);

  useEffect(() => {
    sweepX.value = -180;
    sweepX.value = withRepeat(
      withTiming(380, { duration: 1300, easing: Easing.linear }),
      -1, false,
    );
  }, [sweepX]);

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sweepX.value }],
  }));

  return (
    <View style={{ height, width, borderRadius, backgroundColor: '#E4E4E0', overflow: 'hidden' }}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { width: 100, backgroundColor: 'rgba(255,255,255,0.7)' },
          sweepStyle,
        ]}
      />
    </View>
  );
}

// ── PulsingDots ───────────────────────────────────────────────────────────────
function PulsingDots() {
  const d1 = useSharedValue(0.25);
  const d2 = useSharedValue(0.25);
  const d3 = useSharedValue(0.25);

  const pulseAnim = withSequence(
    withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) }),
    withTiming(0.25, { duration: 400, easing: Easing.in(Easing.cubic) }),
    withTiming(0.25, { duration: 520 }),
  );

  useEffect(() => {
    d1.value = withRepeat(pulseAnim, -1, false);
    d2.value = withDelay(300, withRepeat(pulseAnim, -1, false));
    d3.value = withDelay(600, withRepeat(pulseAnim, -1, false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const s1 = useAnimatedStyle(() => ({ opacity: d1.value }));
  const s2 = useAnimatedStyle(() => ({ opacity: d2.value }));
  const s3 = useAnimatedStyle(() => ({ opacity: d3.value }));

  return (
    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
      {[s1, s2, s3].map((s, i) => (
        <Animated.View
          key={i}
          style={[{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.text.tertiary }, s]}
        />
      ))}
    </View>
  );
}

// ── CircularTimerRing ─────────────────────────────────────────────────────────
type RingProps = {
  startedAt: string;
  plannedMinutes: number;
  paused?: boolean;
};

function CircularTimerRing({ startedAt, plannedMinutes, paused = false }: RingProps) {
  const [now, setNow] = useState(() => Date.now());
  const dashOffset = useSharedValue(0);

  useEffect(() => {
    if (paused) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [paused]);

  useEffect(() => {
    const elapsed = Math.floor((now - new Date(startedAt).getTime()) / 1000);
    const total = plannedMinutes * 60;
    const progress = Math.min(elapsed / total, 1);
    dashOffset.value = withTiming(CIRCUMFERENCE * progress, {
      duration: 1050,
      easing: Easing.linear,
    });
  }, [now, startedAt, plannedMinutes, dashOffset]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: dashOffset.value,
  }));

  return (
    // Rotate wrapper so the arc starts at 12 o'clock (top)
    // Using View transform instead of SVG rotation/origin to avoid web DOM property warning
    <View
      style={[StyleSheet.absoluteFill, { transform: [{ rotate: '-90deg' }] }]}
      pointerEvents="none"
    >
      <Svg width={RING_SIZE} height={RING_SIZE}>
        {/* background track */}
        <Circle
          cx={RING_CX}
          cy={RING_CY}
          r={RING_R}
          stroke={colors.line.secondary}
          strokeWidth={STROKE_WIDTH}
          fill="none"
        />
        {/* progress arc */}
        <AnimatedCircle
          cx={RING_CX}
          cy={RING_CY}
          r={RING_R}
          stroke={colors.text.primary}
          strokeWidth={STROKE_WIDTH}
          fill="none"
          strokeDasharray={CIRCUMFERENCE}
          animatedProps={animatedProps}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────
type Phase = 'active' | 'confirming' | 'done';
type QuizPhase = 'idle' | 'loading' | 'question' | 'submitting' | 'result' | 'error';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ── Main component ────────────────────────────────────────────────────────────
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
  const [countedSeconds, setCountedSeconds] = useState(0);

  const noteMutation = useUpsertSessionNoteMutation(doneSessionId ?? '');
  const autoCompleted = useRef(false);

  // ── Quiz state ───────────────────────────────────────────────────────────
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

  // ── Shared Values ─────────────────────────────────────────────────────────
  const timerScale = useSharedValue(1);
  const pausedLabelOpacity = useSharedValue(0);
  const sheetTranslateY = useSharedValue(SCREEN_HEIGHT);
  const overlayOpacity = useSharedValue(0);
  const doneOpacity = useSharedValue(0);
  const doneSlideY = useSharedValue(24);
  const heroScale = useSharedValue(1.05);
  const resultScale = useSharedValue(0.92);

  // Breathing circles
  const cAScale = useSharedValue(1);
  const cAOpacity = useSharedValue(0.035);
  const cBScale = useSharedValue(1);
  const cBOpacity = useSharedValue(0.025);
  const cCScale = useSharedValue(1);
  const cCOpacity = useSharedValue(0.02);

  // ── Animated Styles ───────────────────────────────────────────────────────
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
  const heroScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heroScale.value }],
  }));
  const resultScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: resultScale.value }],
  }));
  const cAStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cAScale.value }],
    opacity: cAOpacity.value,
  }));
  const cBStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cBScale.value }],
    opacity: cBOpacity.value,
  }));
  const cCStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cCScale.value }],
    opacity: cCOpacity.value,
  }));

  // ── Effects ───────────────────────────────────────────────────────────────

  // Breathing circles — start once on mount
  useEffect(() => {
    const sinEasing = Easing.inOut(Easing.sin);
    cAScale.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 10000, easing: sinEasing }),
        withTiming(1.0, { duration: 10000, easing: sinEasing }),
      ), -1, false,
    );
    cAOpacity.value = withRepeat(
      withSequence(
        withTiming(0.055, { duration: 10000, easing: sinEasing }),
        withTiming(0.035, { duration: 10000, easing: sinEasing }),
      ), -1, false,
    );
    cBScale.value = withRepeat(
      withSequence(
        withTiming(1.0, { duration: 4000, easing: sinEasing }),
        withTiming(1.08, { duration: 8000, easing: sinEasing }),
        withTiming(1.0, { duration: 8000, easing: sinEasing }),
      ), -1, false,
    );
    cBOpacity.value = withRepeat(
      withSequence(
        withTiming(0.025, { duration: 4000, easing: sinEasing }),
        withTiming(0.045, { duration: 8000, easing: sinEasing }),
        withTiming(0.025, { duration: 8000, easing: sinEasing }),
      ), -1, false,
    );
    cCScale.value = withRepeat(
      withSequence(
        withTiming(1.0, { duration: 6000, easing: sinEasing }),
        withTiming(1.15, { duration: 12000, easing: sinEasing }),
        withTiming(1.0, { duration: 12000, easing: sinEasing }),
      ), -1, false,
    );
    cCOpacity.value = withRepeat(
      withSequence(
        withTiming(0.02, { duration: 6000, easing: sinEasing }),
        withTiming(0.04, { duration: 12000, easing: sinEasing }),
        withTiming(0.02, { duration: 12000, easing: sinEasing }),
      ), -1, false,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Done phase enter
  useEffect(() => {
    if (phase !== 'done') return;
    doneOpacity.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) });
    doneSlideY.value = withTiming(0, { duration: 350, easing: Easing.out(Easing.cubic) });
    heroScale.value = withTiming(1.0, { duration: 500, easing: Easing.out(Easing.cubic) });
  }, [phase, doneOpacity, doneSlideY, heroScale]);

  // Count-up
  useEffect(() => {
    if (phase !== 'done') return;
    const target = doneElapsedSeconds;
    let current = 0;
    const steps = 90;
    const inc = target / Math.max(steps, 1);
    const id = setInterval(() => {
      current = Math.min(current + inc, target);
      setCountedSeconds(Math.floor(current));
      if (current >= target) clearInterval(id);
    }, 1000 / 60);
    return () => clearInterval(id);
  }, [phase, doneElapsedSeconds]);

  // Result reveal scale
  useEffect(() => {
    if (quizPhase !== 'result') return;
    resultScale.value = withSpring(1.0, { stiffness: 180, damping: 18, mass: 0.9 });
  }, [quizPhase, resultScale]);

  // Quiz job polling
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

  // ── Guard ─────────────────────────────────────────────────────────────────
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

  // ── Handlers ──────────────────────────────────────────────────────────────
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
    timerScale.value = withSequence(
      withTiming(1.03, { duration: 200, easing: Easing.out(Easing.cubic) }),
      withTiming(1.0, { duration: 200, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(setPhase)('done');
      })
    );
    setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 400);
  };

  const handleConfirmEnd = async () => {
    if (!activeSessionId || !activeSessionStartedAt) return;
    setSheetInteractive(false);
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
      const maxScore = attempt.attempt.questionGrades.reduce((s: number, g: { maxScore: number }) => s + g.maxScore, 0);
      const isGood = maxScore > 0 && attempt.attempt.totalScore / maxScore >= 0.7;
      if (isGood) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
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

  // ── Quiz result helpers ───────────────────────────────────────────────────
  const quizMaxScore = quizAttempt?.questionGrades.reduce((s, g) => s + g.maxScore, 0) ?? 0;
  const isGoodScore = quizMaxScore > 0 && (quizAttempt?.totalScore ?? 0) / quizMaxScore >= 0.7;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView
      style={[styles.fill, { backgroundColor: phase === 'done' ? colors.bg.primary : colors.bg.secondary }]}
      edges={['top', 'bottom']}
    >
      {/* ── ACTIVE / CONFIRMING phase ── */}
      {phase !== 'done' && (
        <View style={styles.fill}>
          {/* Breathing circles */}
          <View style={[StyleSheet.absoluteFill, styles.circlesContainer]} pointerEvents="none">
            <Animated.View style={[styles.circle, styles.circleA, cAStyle]} />
            <Animated.View style={[styles.circle, styles.circleB, cBStyle]} />
            <Animated.View style={[styles.circle, styles.circleC, cCStyle]} />
          </View>

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

            {/* Timer ring + text */}
            <Animated.View style={[styles.timerWrapper, timerScaleStyle]}>
              <CircularTimerRing
                startedAt={activeSessionStartedAt!}
                plannedMinutes={activeSessionPlannedMinutes!}
                paused={isPaused || phase === 'confirming'}
              />
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
            {/* Block 1: elapsed + topic */}
            <Animated.View entering={FadeInDown.duration(280).easing(Easing.out(Easing.cubic))}>
              <Animated.View style={[{ alignItems: 'center', marginBottom: 6 }, heroScaleStyle]}>
                <AppText variant="hero" style={{ fontSize: 64, lineHeight: 72, letterSpacing: -1 }}>
                  {formatClock(countedSeconds)}
                </AppText>
              </Animated.View>
              <AppText
                variant="caption"
                style={{ color: colors.text.tertiary, textAlign: 'center', marginBottom: 40, letterSpacing: 0.5 }}
              >
                {activeSessionTopic ?? ''}
              </AppText>
            </Animated.View>

            {/* Block 2: note */}
            {memo.trim().length > 0 && (
              <Animated.View
                entering={FadeInDown.delay(80).duration(280).easing(Easing.out(Easing.cubic))}
                style={{ marginBottom: spacing['2xl'] }}
              >
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

            {/* Block 3: quiz / CTA */}
            <Animated.View entering={FadeInDown.delay(160).duration(280).easing(Easing.out(Easing.cubic))}>

              {quizPhase === 'idle' && (
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <AppButton label="AI Check" variant="ghost" onPress={() => { void handleReflect(); }} />
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

              {/* ── Quiz loading: shimmer skeleton + pulsing dots ── */}
              {quizPhase === 'loading' && (
                <Animated.View
                  key="quiz-loading"
                  exiting={FadeOut.duration(200)}
                  style={{ gap: spacing.md, paddingTop: spacing.xs }}
                >
                  <ShimmerBlock height={14} width="75%" />
                  <ShimmerBlock height={10} width="90%" />
                  <ShimmerBlock height={10} width="60%" />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs }}>
                    <AppText variant="caption" style={{ color: colors.text.tertiary, letterSpacing: 0.5 }}>
                      Preparing your quiz
                    </AppText>
                    <PulsingDots />
                  </View>
                </Animated.View>
              )}

              {/* ── Quiz question: scale+fade entrance ── */}
              {quizPhase === 'question' && (() => {
                const questions = quizQuery.data?.quiz.questions ?? [];
                const q = questions[currentQuestionIndex];
                if (!q) return null;
                return (
                  <Animated.View
                    key={`question-${currentQuestionIndex}`}
                    entering={ZoomIn.duration(280).easing(Easing.out(Easing.cubic))}
                    style={{ gap: spacing.lg }}
                  >
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
                  </Animated.View>
                );
              })()}

              {quizPhase === 'submitting' && (
                <View style={{ gap: spacing.xs, paddingTop: spacing.md }}>
                  <AppText variant="caption" style={{ color: colors.text.tertiary, letterSpacing: 0.8 }}>
                    Evaluating...
                  </AppText>
                </View>
              )}

              {/* ── Quiz result: spring scale reveal + score tint ── */}
              {quizPhase === 'result' && quizAttempt && (
                <Animated.View
                  entering={FadeIn.duration(240)}
                  style={[{ gap: spacing.lg }, resultScaleStyle]}
                >
                  <View
                    style={[
                      styles.resultBadge,
                      isGoodScore ? styles.resultBadgeGood : styles.resultBadgePoor,
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs }}>
                      <AppText
                        variant="hero"
                        style={{
                          fontSize: 48, lineHeight: 56, letterSpacing: -0.5,
                          color: isGoodScore ? '#1A6B3C' : '#8A3A00',
                        }}
                      >
                        {quizAttempt.totalScore}
                      </AppText>
                      <AppText variant="caption" style={{ color: colors.text.tertiary }}>
                        / {quizMaxScore}
                      </AppText>
                    </View>
                    {quizAttempt.overallFeedback ? (
                      <AppText variant="bodySmall" style={{ color: colors.text.secondary, lineHeight: 22 }}>
                        {quizAttempt.overallFeedback}
                      </AppText>
                    ) : null}
                  </View>
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

            </Animated.View>
          </ScrollView>
        </Animated.View>
      )}

      {/* ── Confirming overlay + sheet ── */}
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
  fill: { flex: 1 },
  circlesContainer: { overflow: 'hidden' },
  circle: {
    position: 'absolute',
    borderRadius: 9999,
    backgroundColor: colors.text.primary,
  },
  circleA: { width: 320, height: 320, top: '15%', left: '-20%' },
  circleB: { width: 240, height: 240, bottom: '18%', right: '-10%' },
  circleC: { width: 180, height: 180, top: '45%', left: '30%' },
  timerWrapper: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
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
  resultBadge: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  resultBadgeGood: {
    backgroundColor: 'rgba(0, 140, 60, 0.07)',
    borderLeftWidth: 2,
    borderLeftColor: '#1A6B3C',
  },
  resultBadgePoor: {
    backgroundColor: 'rgba(180, 60, 0, 0.07)',
    borderLeftWidth: 2,
    borderLeftColor: '#8A3A00',
  },
});
