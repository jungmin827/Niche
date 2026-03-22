import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePressScale } from '../../hooks/usePressScale';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import AppText from '../ui/AppText';

const ALLOWED_MINUTES = [15, 30, 45, 60] as const;
const PLAY_BUTTON_SIZE = 88;
const BUTTON_SPRING = { stiffness: 180, damping: 22, mass: 0.8 } as const;

// ── Animated stepper number — slides up on increase, down on decrease ─────────
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
        translateY.value = withTiming(0, { duration: 100, easing: Easing.out(Easing.cubic) });
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

// ── Props ─────────────────────────────────────────────────────────────────────
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

// ── Component ─────────────────────────────────────────────────────────────────
export default function SessionStartCard({
  streakDays = 0,
  rankLabel = 'Surface',
  todayFocusMinutes = 0,
  hasActiveSession = false,
  isSubmitting = false,
  onSubmit,
  onResumeSession,
}: Props) {
  const [topic, setTopic] = useState('');
  const [minutesIndex, setMinutesIndex] = useState(0);
  const [plannedSessionCount, setPlannedSessionCount] = useState(1);
  const plannedMinutes = ALLOWED_MINUTES[minutesIndex];

  const canPlay = hasActiveSession || (!isSubmitting && topic.trim().length > 0);

  // ── Readiness animation (0 = locked, 1 = ready) ───────────────────────────
  const readyProgress = useSharedValue(canPlay ? 1 : 0);
  const readyScale = useSharedValue(canPlay ? 1 : 0.94);

  useEffect(() => {
    readyProgress.value = withTiming(canPlay ? 1 : 0, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
    readyScale.value = withSpring(canPlay ? 1.0 : 0.94, BUTTON_SPRING);
  }, [canPlay]);

  // ── Play button press scale ───────────────────────────────────────────────
  const pressScale = useSharedValue(1);

  // Combine readiness scale + press scale
  const combinedScale = useDerivedValue(() => readyScale.value * pressScale.value);

  // ── Pulse ring ────────────────────────────────────────────────────────────
  const pulseOpacity = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  const triggerPulse = () => {
    pulseOpacity.value = 0.55;
    pulseScale.value = 1;
    pulseOpacity.value = withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) });
    pulseScale.value = withTiming(1.85, { duration: 420, easing: Easing.out(Easing.cubic) });
  };

  // ── Play handlers ─────────────────────────────────────────────────────────
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

  // ── Animated styles ───────────────────────────────────────────────────────
  const playButtonStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      readyProgress.value,
      [0, 1],
      [colors.dark.line.disabled, colors.dark.line.strong]
    ),
    transform: [{ scale: combinedScale.value }],
  }));

  const playIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(readyProgress.value, [0, 1], [0.2, 1.0]),
  }));

  const pulseRingStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    transform: [{ scale: pulseScale.value }],
  }));

  // ── Stepper press feedback ────────────────────────────────────────────────
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>

        {/* Stats bar */}
        <Animated.View entering={FadeIn.duration(280)} style={styles.statsBar}>
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

        {/* Form — golden ratio offset via paddingBottom */}
        <Animated.View
          entering={FadeInDown.delay(80).duration(300).easing(Easing.out(Easing.cubic))}
          style={styles.formArea}
        >
          <TextInput
            value={topic}
            onChangeText={setTopic}
            placeholder={hasActiveSession ? 'Session in progress.' : 'What is your topic today?'}
            placeholderTextColor={colors.dark.text.placeholder}
            editable={!hasActiveSession}
            style={styles.topicInput}
          />

          <View style={styles.steppers}>
            {/* Time */}
            <View style={styles.stepperRow}>
              <AppText style={styles.stepperLabel}>Time</AppText>
              <View style={styles.stepperControls}>
                <GestureDetector gesture={minuteDec.gesture}>
                  <Animated.View style={[styles.stepperBtn, minuteDec.animatedStyle]}>
                    <AppText style={styles.stepperBtnText}>−</AppText>
                  </Animated.View>
                </GestureDetector>

                <AnimatedStepperValue value={plannedMinutes} unit="mins" />

                <GestureDetector gesture={minuteInc.gesture}>
                  <Animated.View style={[styles.stepperBtn, minuteInc.animatedStyle]}>
                    <AppText style={styles.stepperBtnText}>+</AppText>
                  </Animated.View>
                </GestureDetector>
              </View>
            </View>

            <View style={styles.stepperDivider} />

            {/* Sessions */}
            <View style={styles.stepperRow}>
              <AppText style={styles.stepperLabel}>Sessions</AppText>
              <View style={styles.stepperControls}>
                <GestureDetector gesture={sessionDec.gesture}>
                  <Animated.View style={[styles.stepperBtn, sessionDec.animatedStyle]}>
                    <AppText style={styles.stepperBtnText}>−</AppText>
                  </Animated.View>
                </GestureDetector>

                <AnimatedStepperValue
                  value={plannedSessionCount}
                  unit={plannedSessionCount === 1 ? 'Session' : 'Sessions'}
                />

                <GestureDetector gesture={sessionInc.gesture}>
                  <Animated.View style={[styles.stepperBtn, sessionInc.animatedStyle]}>
                    <AppText style={styles.stepperBtnText}>+</AppText>
                  </Animated.View>
                </GestureDetector>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Play button — anchored at bottom */}
        <Animated.View
          entering={FadeIn.delay(200).duration(280)}
          style={styles.playArea}
        >
          {/* Pulse ring expands behind the button on press */}
          <Animated.View
            style={[styles.pulseRing, pulseRingStyle]}
            pointerEvents="none"
          />

          <GestureDetector gesture={playGesture}>
            <Animated.View style={[styles.playButton, playButtonStyle]}>
              <Animated.View style={playIconStyle}>
                <Ionicons name="play" size={26} color={colors.dark.text.primary} />
              </Animated.View>
            </Animated.View>
          </GestureDetector>

          <AppText style={styles.playHint}>
            {hasActiveSession ? 'Resume session' : 'Ready to begin?'}
          </AppText>
        </Animated.View>

      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.dark.bg,
  },

  // ── Stats ──────────────────────────────────────────────────────────────────
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

  // ── Form ───────────────────────────────────────────────────────────────────
  formArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['3xl'],
    // Golden ratio offset: pushes form to ~38% from top on iPhone 14
    paddingBottom: spacing['6xl'],
    gap: spacing['3xl'],
  },
  topicInput: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.line.input,
    paddingBottom: spacing.md,
    color: colors.dark.text.primary,
    fontSize: typography.title.fontSize,
    textAlign: 'center',
    fontWeight: '300',
  },

  // ── Steppers ───────────────────────────────────────────────────────────────
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
  // No border, no box — just generous hit target
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

  // ── Play button ────────────────────────────────────────────────────────────
  playArea: {
    alignItems: 'center',
    paddingBottom: spacing['3xl'],
    gap: spacing.md,
  },
  // Pulse ring — same size as button, expands outward on tap
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
