import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeInDown,
  interpolate,
  interpolateColor,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePressScale } from '../../hooks/usePressScale';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import AppText from '../ui/AppText';

// ── Motion tokens (design system level) ────────────────────────────────────
const ENTER_DURATION = 280;
const ENTER_EASING = Easing.out(Easing.cubic);
const BUTTON_SPRING = { stiffness: 180, damping: 22, mass: 0.8 } as const;
const ALLOWED_MINUTES = [15, 30, 45, 60] as const;
const PLAY_BUTTON_SIZE = 88;

// ── AnimatedStepperValue — slides vertically on value change ────────────────
function AnimatedStepperValue({ value, unit }: { value: number; unit: string }) {
  const [displayed, setDisplayed] = useState(value);
  const prevRef = useRef(value);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (value === prevRef.current) return;
    const direction = value > prevRef.current ? 1 : -1;
    prevRef.current = value;
    const exitY = direction * spacing.sm;

    opacity.value = withTiming(0, { duration: 80 });
    translateY.value = withTiming(exitY, { duration: 80 }, (finished) => {
      'worklet';
      if (finished) {
        runOnJS(setDisplayed)(value);
        translateY.value = -exitY;
        opacity.value = 0;
        translateY.value = withTiming(0, { duration: 100, easing: ENTER_EASING });
        opacity.value = withTiming(1, { duration: 100 });
      }
    });
  }, [value]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.stepperValueWrap, animStyle]}>
      <AppText style={styles.stepperValue}>
        {displayed} {unit}
      </AppText>
    </Animated.View>
  );
}

// ── AnimatedTopicInput — bottom border brightens on focus ───────────────────
type TopicInputProps = {
  value: string;
  onChangeText: (v: string) => void;
  editable: boolean;
};

function AnimatedTopicInput({ value, onChangeText, editable }: TopicInputProps) {
  const focusProgress = useSharedValue(0);

  const handleFocus = () => {
    focusProgress.value = withTiming(1, { duration: 220, easing: ENTER_EASING });
  };
  const handleBlur = () => {
    focusProgress.value = withTiming(0, { duration: 220, easing: ENTER_EASING });
  };

  const wrapperStyle = useAnimatedStyle(() => ({
    borderBottomColor: interpolateColor(
      focusProgress.value,
      [0, 1],
      [colors.dark.line.input, colors.dark.line.strong],
    ),
  }));

  return (
    <Animated.View style={[styles.inputWrapper, wrapperStyle]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={editable ? 'What is your topic today?' : 'Session in progress.'}
        placeholderTextColor={colors.dark.text.placeholder}
        editable={editable}
        onFocus={handleFocus}
        onBlur={handleBlur}
        returnKeyType="done"
        style={styles.topicInput}
        accessibilityLabel="Session topic"
        accessibilityHint="Enter what you will focus on during this session"
      />
    </Animated.View>
  );
}

// ── Props ───────────────────────────────────────────────────────────────────
type Props = {
  streakDays?: number;
  rankLabel?: string;
  todayFocusMinutes?: number;
  hasActiveSession?: boolean;
  isSubmitting?: boolean;
  onSubmit: (input: {
    topic: string;
    subject: string;
    plannedMinutes: number;
    plannedSessionCount: number;
  }) => void;
  onResumeSession?: () => void;
};

// ── SessionStartCard ─────────────────────────────────────────────────────────
export default function SessionStartCard({
  streakDays = 0,
  rankLabel = 'Surface',
  todayFocusMinutes = 0,
  hasActiveSession = false,
  isSubmitting = false,
  onSubmit,
  onResumeSession,
}: Props) {
  const insets = useSafeAreaInsets();
  const [topic, setTopic] = useState('');
  const [minutesIndex, setMinutesIndex] = useState(0);
  const [plannedSessionCount, setPlannedSessionCount] = useState(1);
  const plannedMinutes = ALLOWED_MINUTES[minutesIndex];

  const canPlay = hasActiveSession || (!isSubmitting && topic.trim().length > 0);

  // ── Readiness animation (0 = locked, 1 = ready) ─────────────────────────
  const readyProgress = useSharedValue(canPlay ? 1 : 0);
  const readyScale = useSharedValue(canPlay ? 1 : 0.94);

  useEffect(() => {
    readyProgress.value = withTiming(canPlay ? 1 : 0, {
      duration: 280,
      easing: ENTER_EASING,
    });
    readyScale.value = withSpring(canPlay ? 1.0 : 0.94, BUTTON_SPRING);
  }, [canPlay]);

  // ── Submitting pulse — breathes on the play icon while pending ──────────
  const submittingPulse = useSharedValue(1);
  useEffect(() => {
    if (isSubmitting) {
      submittingPulse.value = withRepeat(
        withTiming(0.3, { duration: 560, easing: ENTER_EASING }),
        -1,
        true,
        undefined,
        ReduceMotion.Never,
      );
    } else {
      cancelAnimation(submittingPulse);
      submittingPulse.value = withTiming(1, { duration: 200 });
    }
  }, [isSubmitting]);

  // ── Play button press scale ─────────────────────────────────────────────
  const pressScale = useSharedValue(1);
  const combinedScale = useDerivedValue(() => readyScale.value * pressScale.value);

  // ── Pulse ring — expands outward on tap ─────────────────────────────────
  const pulseOpacity = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  const triggerPulse = () => {
    pulseOpacity.value = 0.55;
    pulseScale.value = 1;
    pulseOpacity.value = withTiming(0, { duration: 420, easing: ENTER_EASING });
    pulseScale.value = withTiming(1.85, { duration: 420, easing: ENTER_EASING });
  };

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleHaptic = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

  const handleNavigate = () => {
    if (hasActiveSession) {
      onResumeSession?.();
      return;
    }
    onSubmit({ topic, subject: '', plannedMinutes, plannedSessionCount });
  };

  const handlePlay = () => {
    triggerPulse();
    setTimeout(handleNavigate, 130);
  };

  const playGesture = Gesture.Tap()
    .enabled(canPlay)
    .onBegin(() => {
      'worklet';
      pressScale.value = withSpring(0.97, { stiffness: 200, damping: 20 });
    })
    .onFinalize(() => {
      'worklet';
      pressScale.value = withSpring(1.0, { stiffness: 200, damping: 20 });
    })
    .onEnd(() => {
      'worklet';
      runOnJS(handleHaptic)();
      runOnJS(handlePlay)();
    });

  // ── Animated styles ─────────────────────────────────────────────────────
  const playButtonStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      readyProgress.value,
      [0, 1],
      [colors.dark.line.disabled, colors.dark.line.strong],
    ),
    transform: [{ scale: combinedScale.value }],
  }));

  // Combines readiness opacity + submitting breathe
  const playIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(readyProgress.value, [0, 1], [0.2, 1.0]) * submittingPulse.value,
  }));

  const pulseRingStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    transform: [{ scale: pulseScale.value }],
  }));

  // ── Stepper handlers ────────────────────────────────────────────────────
  const handleMinuteDec = () => {
    Haptics.selectionAsync();
    setMinutesIndex((i) => Math.max(0, i - 1));
  };
  const handleMinuteInc = () => {
    Haptics.selectionAsync();
    setMinutesIndex((i) => Math.min(ALLOWED_MINUTES.length - 1, i + 1));
  };
  const handleSessionDec = () => {
    Haptics.selectionAsync();
    setPlannedSessionCount((s) => Math.max(1, s - 1));
  };
  const handleSessionInc = () => {
    Haptics.selectionAsync();
    setPlannedSessionCount((s) => s + 1);
  };

  const minuteDec = usePressScale(handleMinuteDec);
  const minuteInc = usePressScale(handleMinuteInc);
  const sessionDec = usePressScale(handleSessionDec);
  const sessionInc = usePressScale(handleSessionInc);

  const hintText = hasActiveSession ? 'Resume session' : 'Ready to begin?';

  // ── Ambient glow — single white circle breathing from bottom-center ──────
  const ambientScale = useSharedValue(1);
  const ambientOpacity = useSharedValue(0.04);
  useEffect(() => {
    const ease = Easing.inOut(Easing.quad);
    ambientScale.value = withRepeat(withTiming(1.18, { duration: 16000, easing: ease }), -1, true, undefined, ReduceMotion.Never);
    ambientOpacity.value = withRepeat(withTiming(0.09, { duration: 16000, easing: ease }), -1, true, undefined, ReduceMotion.Never);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const ambientStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ambientScale.value }],
    opacity: ambientOpacity.value,
  }));

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Ambient glow — bottom-center, behind all content */}
        <Animated.View style={[styles.ambientCircle, ambientStyle]} pointerEvents="none" />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Stats bar — block 1 */}
          <Animated.View
            entering={FadeInDown.duration(ENTER_DURATION).easing(ENTER_EASING)}
            style={styles.statsBar}
          >
            <View style={styles.statItem}>
              <AppText style={styles.statLabel}>Today</AppText>
              <AppText style={styles.statValue}>{todayFocusMinutes}m</AppText>
            </View>
            <View style={[styles.statItem, { alignItems: 'center' }]}>
              <AppText style={styles.statLabel}>Rank</AppText>
              <AppText style={styles.statValue}>{rankLabel}</AppText>
            </View>
            <View style={[styles.statItem, { alignItems: 'flex-end' }]}>
              <AppText style={styles.statLabel}>Streak</AppText>
              <AppText style={styles.statValue}>{streakDays > 0 ? `${streakDays}d` : '—'}</AppText>
            </View>
          </Animated.View>

          {/* Form — block 2 */}
          <Animated.View
            entering={FadeInDown.delay(100).duration(ENTER_DURATION).easing(ENTER_EASING)}
            style={styles.formArea}
          >
            <AnimatedTopicInput
              value={topic}
              onChangeText={setTopic}
              editable={!hasActiveSession}
            />

            <View style={styles.steppers}>
              {/* Time stepper */}
              <View style={styles.stepperRow}>
                <AppText style={styles.stepperLabel}>Time</AppText>
                <View style={styles.stepperControls}>
                  <GestureDetector gesture={minuteDec.gesture}>
                    <Animated.View
                      style={[styles.stepperBtn, minuteDec.animatedStyle]}
                      accessibilityRole="button"
                      accessibilityLabel="Decrease time"
                    >
                      <AppText style={styles.stepperBtnText}>−</AppText>
                    </Animated.View>
                  </GestureDetector>

                  <AnimatedStepperValue value={plannedMinutes} unit="mins" />

                  <GestureDetector gesture={minuteInc.gesture}>
                    <Animated.View
                      style={[styles.stepperBtn, minuteInc.animatedStyle]}
                      accessibilityRole="button"
                      accessibilityLabel="Increase time"
                    >
                      <AppText style={styles.stepperBtnText}>+</AppText>
                    </Animated.View>
                  </GestureDetector>
                </View>
              </View>

              <View style={styles.stepperDivider} />

              {/* Sessions stepper */}
              <View style={styles.stepperRow}>
                <AppText style={styles.stepperLabel}>Sessions</AppText>
                <View style={styles.stepperControls}>
                  <GestureDetector gesture={sessionDec.gesture}>
                    <Animated.View
                      style={[styles.stepperBtn, sessionDec.animatedStyle]}
                      accessibilityRole="button"
                      accessibilityLabel="Decrease session count"
                    >
                      <AppText style={styles.stepperBtnText}>−</AppText>
                    </Animated.View>
                  </GestureDetector>

                  <AnimatedStepperValue
                    value={plannedSessionCount}
                    unit={plannedSessionCount === 1 ? 'Session' : 'Sessions'}
                  />

                  <GestureDetector gesture={sessionInc.gesture}>
                    <Animated.View
                      style={[styles.stepperBtn, sessionInc.animatedStyle]}
                      accessibilityRole="button"
                      accessibilityLabel="Increase session count"
                    >
                      <AppText style={styles.stepperBtnText}>+</AppText>
                    </Animated.View>
                  </GestureDetector>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Play button — block 3 */}
          <Animated.View
            entering={FadeInDown.delay(200).duration(ENTER_DURATION).easing(ENTER_EASING)}
            style={[styles.playArea, { paddingBottom: insets.bottom + spacing['3xl'] }]}
          >
            {/* Pulse ring expands behind the button on tap */}
            <Animated.View style={[styles.pulseRing, pulseRingStyle]} pointerEvents="none" />

            <GestureDetector gesture={playGesture}>
              <Animated.View
                style={[styles.playButton, playButtonStyle]}
                accessibilityRole="button"
                accessibilityLabel={hintText}
                accessibilityState={{ disabled: !canPlay, busy: isSubmitting }}
              >
                <Animated.View style={playIconStyle}>
                  <Ionicons name="play" size={26} color={colors.dark.text.primary} />
                </Animated.View>
              </Animated.View>
            </GestureDetector>

            {/* Hint text fades in fresh when state changes */}
            <Animated.View key={hintText} entering={FadeIn.duration(200)}>
              <AppText style={styles.playHint}>{hintText}</AppText>
            </Animated.View>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.dark.bg,
  },
  ambientCircle: {
    position: 'absolute',
    width: 480,
    height: 480,
    borderRadius: 240,
    bottom: '-20%',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    backgroundColor: 'transparent',
  },

  // ── Stats ────────────────────────────────────────────────────────────────
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['3xl'],
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  statItem: {
    gap: spacing.xs,
  },
  statLabel: {
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    color: colors.dark.text.muted,
  },
  statValue: {
    fontSize: typography.title.fontSize,
    lineHeight: typography.title.lineHeight,
    fontWeight: '500',
    color: colors.dark.text.primary,
  },

  // ── Form ─────────────────────────────────────────────────────────────────
  formArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['3xl'],
    paddingBottom: spacing['6xl'],
    gap: spacing['3xl'],
  },
  // Border lives on the wrapper so useAnimatedStyle can drive borderBottomColor
  inputWrapper: {
    width: '100%',
    borderBottomWidth: 1,
    paddingBottom: spacing.md,
  },
  topicInput: {
    width: '100%',
    color: colors.dark.text.primary,
    fontSize: typography.title.fontSize,
    textAlign: 'center',
    fontWeight: '300',
  },

  // ── Steppers ─────────────────────────────────────────────────────────────
  steppers: {
    width: '100%',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  stepperLabel: {
    fontSize: typography.bodySmall.fontSize,
    lineHeight: typography.bodySmall.lineHeight,
    color: colors.dark.text.secondary,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  // Generous hit area, no visual box
  stepperBtn: {
    width: spacing['4xl'],
    height: spacing['4xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.dark.text.secondary,
    fontWeight: '300',
  },
  stepperValueWrap: {
    minWidth: 90,
    alignItems: 'center',
    overflow: 'hidden',
  },
  stepperValue: {
    fontSize: typography.bodySmall.fontSize,
    lineHeight: typography.bodySmall.lineHeight,
    color: colors.dark.text.primary,
    textAlign: 'center',
  },
  stepperDivider: {
    height: 1,
    backgroundColor: colors.dark.line.divider,
  },

  // ── Play button ───────────────────────────────────────────────────────────
  playArea: {
    alignItems: 'center',
    gap: spacing.md,
  },
  pulseRing: {
    position: 'absolute',
    width: PLAY_BUTTON_SIZE,
    height: PLAY_BUTTON_SIZE,
    borderRadius: PLAY_BUTTON_SIZE / 2,
    borderWidth: 1,
    borderColor: colors.dark.line.strong,
  },
  playButton: {
    width: PLAY_BUTTON_SIZE,
    height: PLAY_BUTTON_SIZE,
    borderRadius: PLAY_BUTTON_SIZE / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playHint: {
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    color: colors.dark.text.hint,
  },
});
