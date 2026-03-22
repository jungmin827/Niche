import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';
import { clearSessionNoteDraft, writeSessionNoteDraft } from '../../features/session/utils';
import AppButton from '../ui/AppButton';
import AppInput from '../ui/AppInput';
import AppText from '../ui/AppText';

const sessionNoteSchema = z.object({
  summary: z
    .string()
    .trim()
    .min(1, '무엇을 봤는지 적어주세요.')
    .max(280, '너무 길지 않게 정리해 주세요.'),
  insight: z.string().trim().max(180, '한 줄은 조금 더 짧게 적어주세요.').optional(),
});

export type SessionNoteFormValues = z.infer<typeof sessionNoteSchema>;

type Props = {
  sessionId: string;
  initialValues?: Partial<SessionNoteFormValues>;
  isSubmitting?: boolean;
  onSubmit: (values: SessionNoteFormValues) => Promise<void> | void;
};

export default function SessionNoteForm({
  sessionId,
  initialValues,
  isSubmitting,
  onSubmit,
}: Props) {
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SessionNoteFormValues>({
    defaultValues: {
      summary: initialValues?.summary ?? '',
      insight: initialValues?.insight ?? '',
    },
    resolver: zodResolver(sessionNoteSchema),
  });

  const watchedValues = watch();

  useEffect(() => {
    void writeSessionNoteDraft(sessionId, {
      summary: watchedValues.summary ?? '',
      insight: watchedValues.insight ?? '',
    });
  }, [sessionId, watchedValues.insight, watchedValues.summary]);

  return (
    <View className="gap-6">
      <View className="gap-3">
        <AppText variant="title">세션을 마무리할 기록</AppText>
        <AppText variant="bodySmall" className="text-[#555555]">
          지금 떠오르는 생각을 적어보세요.
        </AppText>
      </View>

      <Controller
        control={control}
        name="summary"
        render={({ field: { onChange, value } }) => (
          <AppInput
            error={errors.summary?.message}
            label="무엇을 봤나요?"
            multiline
            numberOfLines={6}
            onChangeText={onChange}
            placeholder="짧게 정리해보세요."
            className="min-h-[140px]"
            value={value}
          />
        )}
      />

      <Controller
        control={control}
        name="insight"
        render={({ field: { onChange, value } }) => (
          <AppInput
            error={errors.insight?.message}
            label="어떤 점이 남았나요?"
            multiline
            numberOfLines={3}
            onChangeText={onChange}
            placeholder="오늘의 한 줄을 남겨보세요."
            className="min-h-[104px]"
            value={value}
          />
        )}
      />

      <AppButton
        disabled={isSubmitting}
        label="기록 저장"
        onPress={handleSubmit(async (values) => {
          await onSubmit(values);
          await clearSessionNoteDraft(sessionId);
        })}
      />
    </View>
  );
}
