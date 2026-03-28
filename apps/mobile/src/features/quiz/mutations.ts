import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createQuizJob, submitQuizAttempt } from '../../api/quiz';
import { queryKeys } from '../../constants/queryKeys';

export function useCreateQuizJobMutation() {
  return useMutation({
    mutationFn: (sessionId: string) => createQuizJob(sessionId),
  });
}

export function useSubmitQuizAttemptMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ quizId, answers }: { quizId: string; answers: string[] }) =>
      submitQuizAttempt(quizId, answers),
    onSuccess: () => {
      // 퀴즈 점수 반영 후 랭크·rankScore 캐시 갱신
      queryClient.invalidateQueries({ queryKey: queryKeys.archiveMe });
    },
  });
}
