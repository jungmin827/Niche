import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import Screen from '../../../components/layout/Screen';
import TopBar from '../../../components/layout/TopBar';
import AppButton from '../../../components/ui/AppButton';
import AppCard from '../../../components/ui/AppCard';
import AppText from '../../../components/ui/AppText';
import SessionNoteForm from '../../../components/session/SessionNoteForm';
import { toApiError } from '../../../lib/error';
import { useSessionDetailQuery, useUpsertSessionNoteMutation } from '../hooks';
import { readSessionNoteDraft } from '../utils';
import { useCreateQuizJobMutation } from '../../quiz/hooks';

export default function SessionNoteModalScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const detailQuery = useSessionDetailQuery(sessionId ?? '');
  const noteMutation = useUpsertSessionNoteMutation(sessionId ?? '');
  const createQuizJobMutation = useCreateQuizJobMutation();
  const [draft, setDraft] = useState<{ summary: string; insight: string } | null>(null);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    readSessionNoteDraft(sessionId).then(setDraft).catch(() => setDraft(null));
  }, [sessionId]);

  if (!sessionId) {
    return (
      <Screen>
        <TopBar title="기록" leadingLabel="닫기" />
        <AppText variant="body">세션을 찾을 수 없습니다.</AppText>
      </Screen>
    );
  }

  const note = detailQuery.data?.note;

  return (
    <Screen scroll>
      <TopBar
        title="세션 기록"
        subtitle="세션을 마무리할 질문에 짧게 답해보세요."
        leadingLabel="닫기"
        onLeadingPress={() => router.back()}
      />

      {detailQuery.isLoading ? (
        <AppText variant="body">세션을 불러오는 중입니다.</AppText>
      ) : detailQuery.isError ? (
        <AppCard className="gap-4 bg-[#F6F6F4]">
          <AppText variant="title">기록할 세션을 불러오지 못했습니다.</AppText>
          <AppText variant="bodySmall" className="text-[#555555]">
            {toApiError(detailQuery.error).message}
          </AppText>
          <AppButton label="다시 시도" variant="secondary" onPress={() => detailQuery.refetch()} />
        </AppCard>
      ) : (
        <SessionNoteForm
          initialValues={{
            summary: draft?.summary ?? note?.summary ?? '',
            insight: draft?.insight ?? note?.insight ?? '',
          }}
          isSubmitting={noteMutation.isPending}
          onSubmit={async (values) => {
            await noteMutation.mutateAsync({
              summary: values.summary,
              insight: values.insight,
            });

            try {
              const { job } = await createQuizJobMutation.mutateAsync(sessionId);
              router.replace({
                pathname: '/(modals)/quiz-loading',
                params: { jobId: job.jobId, sessionId },
              });
            } catch {
              router.replace('/(tabs)/session');
            }
          }}
          sessionId={sessionId}
        />
      )}
    </Screen>
  );
}
