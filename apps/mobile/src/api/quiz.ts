import { Quiz, QuizAttempt, QuizAttemptDetail, QuizJob } from '../features/quiz/types';
import { apiRequest } from './client';

export async function createQuizJob(sessionId: string) {
  return apiRequest<{ job: QuizJob }>('/v1/quizzes/jobs', {
    method: 'POST',
    body: { sessionId },
  });
}

export async function getQuizJob(jobId: string) {
  return apiRequest<{ job: QuizJob }>(`/v1/quizzes/jobs/${jobId}`);
}

export async function getQuiz(quizId: string) {
  return apiRequest<{ quiz: Quiz }>(`/v1/quizzes/${quizId}`);
}

export async function submitQuizAttempt(quizId: string, answers: string[]) {
  return apiRequest<{ attempt: QuizAttempt }>(`/v1/quizzes/${quizId}/attempts`, {
    method: 'POST',
    body: { answers },
  });
}

export async function getQuizAttempt(quizId: string, attemptId: string) {
  return apiRequest<QuizAttemptDetail>(`/v1/quizzes/${quizId}/attempts/${attemptId}`);
}
