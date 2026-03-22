import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { SESSION_PRESET_MINUTES } from '../../features/session/utils';
import AppButton from '../ui/AppButton';
import AppCard from '../ui/AppCard';
import AppInput from '../ui/AppInput';
import AppText from '../ui/AppText';

type Props = {
  isSubmitting?: boolean;
  onSubmit: (input: { topic: string; subject: string; plannedMinutes: number }) => void;
};

export default function SessionStartCard({ isSubmitting, onSubmit }: Props) {
  const [topic, setTopic] = useState('');
  const [subject, setSubject] = useState('');
  const [plannedMinutes, setPlannedMinutes] = useState<number>(15);

  return (
    <AppCard className="gap-6">
      <View className="gap-3">
        <AppText variant="title">오늘의 세션</AppText>
        <AppText variant="bodySmall" className="text-[#555555]">
          지금 보고 있는 것을 따라가 보세요.
        </AppText>
      </View>

      <AppInput
        label="주제"
        placeholder="무엇을 따라가고 있나요?"
        value={topic}
        onChangeText={setTopic}
        hint="짧게 적어두면 세션이 더 선명해집니다."
      />

      <AppInput
        label="분류"
        placeholder="책, 영화, 관찰, 사유"
        value={subject}
        onChangeText={setSubject}
      />

      <View className="gap-3">
        <AppText variant="caption" className="text-[#555555]">
          시간
        </AppText>
        <View className="flex-row gap-3">
          {SESSION_PRESET_MINUTES.map((minutes) => {
            const selected = plannedMinutes === minutes;

            return (
              <Pressable
                key={minutes}
                className={`rounded-full border px-4 py-[11px] ${
                  selected ? 'border-black bg-black' : 'border-[#D9D9D4] bg-[#F6F6F4]'
                }`}
                onPress={() => setPlannedMinutes(minutes)}
              >
                <AppText color={selected ? 'inverse' : 'primary'} variant="bodySmall">
                  {minutes}분
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <AppButton
        disabled={isSubmitting || topic.trim().length === 0}
        label={plannedMinutes === 15 ? '세션 시작' : `${plannedMinutes}분 시작`}
        onPress={() => onSubmit({ topic, subject, plannedMinutes })}
      />
    </AppCard>
  );
}
