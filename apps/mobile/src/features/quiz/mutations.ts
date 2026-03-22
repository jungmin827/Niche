import { useMutation } from '@tanstack/react-query';
import { createQuizJob, submitQuizAttempt } from '../../api/quiz';

export function useCreateQuizJobMutation() {
  return useMutation({
    mutationFn: (sessionId: string) => createQuizJob(sessionId),
  });
}

export function useSubmitQuizAttemptMutation() {
  return useMutation({
    mutationFn: ({ quizId, answers }: { quizId: string; answers: string[] }) =>
      submitQuizAttempt(quizId, answers),
  });
}
