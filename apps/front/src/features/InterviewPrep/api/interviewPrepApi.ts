import { apiClient } from '@/shared/api/base';

export type InterviewPrepType =
  | 'coding'
  | 'algorithm'
  | 'system_design'
  | 'sql'
  | 'code_review';

export type InterviewPrepSessionStatus = 'active' | 'finished';
export type InterviewPrepSelfAssessment = 'answered' | 'skipped';

export interface InterviewPrepTask {
  id: string;
  slug: string;
  title: string;
  statement: string;
  prepType: InterviewPrepType;
  language: string;
  isExecutable: boolean;
  executionProfile: string;
  runnerMode: string;
  durationSeconds: number;
  starterCode: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewPrepQuestion {
  id: string;
  taskId: string;
  position: number;
  prompt: string;
  answer: string;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewPrepQuestionResult {
  id: string;
  sessionId: string;
  questionId: string;
  selfAssessment: InterviewPrepSelfAssessment;
  answeredAt: string;
}

export interface InterviewPrepSession {
  id: string;
  userId: string;
  taskId: string;
  status: InterviewPrepSessionStatus;
  currentQuestionPosition: number;
  code: string;
  lastSubmissionPassed: boolean;
  startedAt: string;
  finishedAt?: string;
  createdAt: string;
  updatedAt: string;
  task?: InterviewPrepTask;
  currentQuestion?: InterviewPrepQuestion;
}

export interface InterviewPrepSubmitResult {
  passed: boolean;
  lastError: string;
  session?: InterviewPrepSession;
}

const normalizeTask = (task: any): InterviewPrepTask => ({
  id: task.id,
  slug: task.slug,
  title: task.title,
  statement: task.statement,
  prepType: task.prepType ?? task.prep_type,
  language: task.language,
  isExecutable: Boolean(task.isExecutable ?? task.is_executable),
  executionProfile: task.executionProfile ?? task.execution_profile ?? 'pure',
  runnerMode: task.runnerMode ?? task.runner_mode ?? 'function_io',
  durationSeconds: Number(task.durationSeconds ?? task.duration_seconds ?? 1800),
  starterCode: task.starterCode ?? task.starter_code ?? '',
  isActive: Boolean(task.isActive ?? task.is_active),
  createdAt: task.createdAt ?? task.created_at,
  updatedAt: task.updatedAt ?? task.updated_at,
});

const normalizeQuestion = (question: any): InterviewPrepQuestion => ({
  id: question.id,
  taskId: question.taskId ?? question.task_id,
  position: Number(question.position ?? 0),
  prompt: question.prompt ?? '',
  answer: question.answer ?? '',
  createdAt: question.createdAt ?? question.created_at,
  updatedAt: question.updatedAt ?? question.updated_at,
});

const normalizeQuestionResult = (result: any): InterviewPrepQuestionResult => ({
  id: result.id,
  sessionId: result.sessionId ?? result.session_id,
  questionId: result.questionId ?? result.question_id,
  selfAssessment: result.selfAssessment ?? result.self_assessment,
  answeredAt: result.answeredAt ?? result.answered_at,
});

const normalizeSession = (session: any): InterviewPrepSession => ({
  id: session.id,
  userId: session.userId ?? session.user_id,
  taskId: session.taskId ?? session.task_id,
  status: session.status,
  currentQuestionPosition: Number(session.currentQuestionPosition ?? session.current_question_position ?? 0),
  code: session.code ?? '',
  lastSubmissionPassed: Boolean(session.lastSubmissionPassed ?? session.last_submission_passed),
  startedAt: session.startedAt ?? session.started_at,
  finishedAt: session.finishedAt ?? session.finished_at,
  createdAt: session.createdAt ?? session.created_at,
  updatedAt: session.updatedAt ?? session.updated_at,
  task: session.task ? normalizeTask(session.task) : undefined,
  currentQuestion: session.currentQuestion || session.current_question
    ? normalizeQuestion(session.currentQuestion ?? session.current_question)
    : undefined,
  results: Array.isArray(session.results) ? session.results.map(normalizeQuestionResult) : [],
});

export const interviewPrepApi = {
  listTasks: async (): Promise<InterviewPrepTask[]> => {
    const response = await apiClient.get<{ tasks: any[] }>('/api/v1/interview-prep/tasks');
    return (response.data.tasks || []).map(normalizeTask);
  },

  startSession: async (taskId: string): Promise<InterviewPrepSession> => {
    const response = await apiClient.post<{ session: any }>('/api/v1/interview-prep/sessions', { taskId });
    return normalizeSession(response.data.session);
  },

  getSession: async (sessionId: string): Promise<InterviewPrepSession> => {
    const response = await apiClient.get<{ session: any }>(`/api/v1/interview-prep/sessions/${sessionId}`);
    return normalizeSession(response.data.session);
  },

  submit: async (sessionId: string, code: string): Promise<InterviewPrepSubmitResult> => {
    const response = await apiClient.post<any>(`/api/v1/interview-prep/sessions/${sessionId}/submit`, { code });
    const result = response.data.result;
    return {
      passed: Boolean(result?.passed ?? false),
      lastError: result?.lastError ?? '',
      session: result?.session ? normalizeSession(result.session) : undefined,
    };
  },

  answerQuestion: async (
    sessionId: string,
    questionId: string,
    selfAssessment: InterviewPrepSelfAssessment,
  ): Promise<InterviewPrepSession> => {
    const response = await apiClient.post<{ session: any }>(
      `/api/v1/interview-prep/sessions/${sessionId}/questions/${questionId}/answer`,
      { selfAssessment },
    );
    return normalizeSession(response.data.session);
  },
};