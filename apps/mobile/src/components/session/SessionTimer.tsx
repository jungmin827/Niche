import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { formatClock } from '../../lib/date';
import AppText from '../ui/AppText';

type Props = {
  startedAt: string;
  plannedMinutes: number;
  paused?: boolean;
  mode?: 'remaining' | 'elapsed';
};

export default function SessionTimer({
  startedAt,
  plannedMinutes,
  paused = false,
  mode = 'remaining',
}: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (paused) return undefined;

    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, [paused]);

  const elapsedSeconds = Math.floor((now - new Date(startedAt).getTime()) / 1000);
  const totalSeconds = plannedMinutes * 60;
  const remainingSeconds = Math.max(totalSeconds - elapsedSeconds, 0);

  const displaySeconds = mode === 'elapsed' ? elapsedSeconds : remainingSeconds;

  return (
    <View style={{ alignItems: 'center' }}>
      <AppText
        variant="hero"
        style={{ fontSize: 72, lineHeight: 80, letterSpacing: -1, color: '#000' }}
      >
        {formatClock(displaySeconds)}
      </AppText>
    </View>
  );
}
