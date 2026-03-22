import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { formatClock } from '../../lib/date';
import AppText from '../ui/AppText';

type Props = {
  startedAt: string;
  plannedMinutes: number;
  paused?: boolean;
};

export default function SessionTimer({ startedAt, plannedMinutes, paused = false }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (paused) {
      return undefined;
    }

    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, [paused]);

  const elapsedSeconds = Math.floor((now - new Date(startedAt).getTime()) / 1000);
  const totalSeconds = plannedMinutes * 60;
  const remainingSeconds = Math.max(totalSeconds - elapsedSeconds, 0);

  return (
    <View className="items-center gap-4">
      <AppText variant="caption" className="text-[#8A8A84] tracking-[0.6px]">
        지금의 시간
      </AppText>
      <AppText variant="hero" className="text-[52px] leading-[52px] tracking-[-0.8px]">
        {formatClock(remainingSeconds)}
      </AppText>
      <AppText variant="bodySmall" className="text-[#555555]">
        끝난 뒤 짧게 남기면 됩니다.
      </AppText>
    </View>
  );
}
