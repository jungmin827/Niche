import { useQuery } from '@tanstack/react-query';
import { getQuiz, getQuizAttempt, getQuizJob } from '../../api/quiz';
import { queryKeys } from '../../constants/queryKeys';

export function useQuizJobQuery(jobId: string) {
  return useQuery({
    queryKey: queryKeys.quizJob(jobId),
    queryFn: () => getQuizJob(jobId),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.job.status;
      return status === 'pending' || status === 'processing' ? 4000 : false;
    },
  });
}

export function useQuizQuery(quizId: string) {
  return useQuery({
    queryKey: queryKeys.quizDetail(quizId),
    queryFn: () => getQuiz(quizId),
    enabled: Boolean(quizId),
  });
}

export function useQuizAttemptQuery(quizId: string, attemptId: string) {
  return useQuery({
    queryKey: queryKeys.quizAttempt(quizId, attemptId),
    queryFn: () => getQuizAttempt(quizId, attemptId),
    enabled: Boolean(quizId) && Boolean(attemptId),
  });
}
