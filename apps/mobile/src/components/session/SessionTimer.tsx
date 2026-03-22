import { useEffect, useRef, useState } from 'react';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { formatClock } from '../../lib/date';
import { colors } from '../../theme/tokens';
import AppText from '../ui/AppText';

type Props = {
  startedAt: string;
  plannedMinutes: number;
  paused?: boolean;
  mode?: 'remaining' | 'elapsed';
  onExpire?: () => void;
};

export default function SessionTimer({
  startedAt,
  plannedMinutes,
  paused = false,
  mode = 'remaining',
  onExpire,
}: Props) {
  const [now, setNow] = useState(() => Date.now());
  const expiredRef = useRef(false);
  const isFirstTick = useRef(true);

  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (paused) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [paused]);

  const elapsedSeconds = Math.floor((now - new Date(startedAt).getTime()) / 1000);
  const totalSeconds = plannedMinutes * 60;
  const remainingSeconds = Math.max(totalSeconds - elapsedSeconds, 0);
  const displaySeconds = mode === 'elapsed' ? elapsedSeconds : remainingSeconds;

  useEffect(() => {
    if (!expiredRef.current && elapsedSeconds >= totalSeconds && onExpire) {
      expiredRef.current = true;
      onExpire();
    }
  }, [elapsedSeconds, totalSeconds, onExpire]);

  // 매초 위→아래 슬라이드 (첫 렌더는 제외)
  useEffect(() => {
    if (isFirstTick.current) {
      isFirstTick.current = false;
      return;
    }
    translateY.value = -8;
    opacity.value = 0;
    translateY.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.cubic) });
    opacity.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) });
  }, [displaySeconds, translateY, opacity]);

  const digitStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[{ alignItems: 'center' }, digitStyle]}>
      <AppText
        variant="hero"
        style={{ fontSize: 72, lineHeight: 80, letterSpacing: -2, color: colors.text.primary }}
      >
        {formatClock(displaySeconds)}
      </AppText>
    </Animated.View>
  );
}
