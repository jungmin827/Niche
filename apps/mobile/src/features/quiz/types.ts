// Status from backend: 'pending' not 'queued'
export type QuizJobStatus = 'pending' | 'processing' | 'done' | 'failed';

// Matches backend QuizJobDTO
export interface QuizJob {
  id: string;
  status: QuizJobStatus;
  quizId: string | null;
}

// Matches backend QuizQuestionDTO
export interface QuizQuestion {
  sequenceNo: number;
  questionType: string;
  intentLabel: string;
  promptText: string;
}

// Matches backend QuizDTO
export interface Quiz {
  id: string;
  sessionId: string;
  questions: QuizQuestion[];
  createdAt: string;
}

// Grade inside POST /attempts response (QuizAnswerGradeDTO)
export interface QuizAnswerGrade {
  sequenceNo: number;
  score: number;
  maxScore: number;
  comment: string;
}

// POST /attempts response body (QuizAttemptDTO)
export interface QuizAttempt {
  id: string;
  quizId: string;
  answers: string[];
  totalScore: number;
  overallFeedback: string;
  questionGrades: QuizAnswerGrade[];
  createdAt: string;
}

// Grade inside GET /attempts/{id} response (QuizAttemptGradeDetailDTO)
export interface QuestionGrade {
  questionId: string;
  order: number;
  score: number;
  maxScore: number;
  feedback: string;
}

// GET /attempts/{id} response — flat, no wrapper (QuizAttemptDetailDTO)
export interface QuizAttemptDetail {
  attemptId: string;
  quizId: string;
  totalScore: number;
  overallFeedback: string;
  questionGrades: QuestionGrade[];
}
