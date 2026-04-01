import { apiClient } from '@/shared/api/base';

const interviewPrepTasksCache = {
  data: null as InterviewPrepTask[] | null,
  timestamp: 0,
  ttlMs: 60_000,
};

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
  companyTag: string;
  supportedLanguages: string[];
  isExecutable: boolean;
  executionProfile: string;
  runnerMode: string;
  durationSeconds: number;
  starterCode: string;
  codeTaskId?: string;
  /** Only populated in admin context */
  referenceSolution?: string;
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

export interface InterviewPrepSession {
  id: string;
  userId: string;
  taskId: string;
  status: InterviewPrepSessionStatus;
  currentQuestionPosition: number;
  solveLanguage: string;
  code: string;
  lastSubmissionPassed: boolean;
  startedAt: string;
  finishedAt?: string;
  createdAt: string;
  updatedAt: string;
  task?: InterviewPrepTask;
  currentQuestion?: InterviewPrepQuestion;
  results?: InterviewPrepQuestionResult[];
}

export interface InterviewPrepSubmitResult {
  passed: boolean;
  lastError: string;
  passedCount: number;
  totalCount: number;
  failedTestIndex: number;
  failureKind: string;
  session?: InterviewPrepSession;
}

export interface InterviewPrepQuestionResult {
  id: string;
  sessionId: string;
  questionId: string;
  selfAssessment: InterviewPrepSelfAssessment;
  answeredAt: string;
}

export interface InterviewPrepAnswerResult {
  answeredQuestion?: InterviewPrepQuestion;
  session: InterviewPrepSession;
}

export interface InterviewPrepSystemDesignReview {
  provider: string;
  model: string;
  score: number;
  summary: string;
  strengths: string[];
  issues: string[];
  missingTopics: string[];
  followUpQuestions: string[];
  disclaimer: string;
}

const normalizeTask = (task: any): InterviewPrepTask => ({
  id: task.id,
  slug: task.slug,
  title: task.title,
  statement: task.statement,
  prepType: task.prepType ?? task.prep_type,
  language: task.language,
  companyTag: task.companyTag ?? task.company_tag ?? '',
  supportedLanguages: Array.isArray(task.supportedLanguages ?? task.supported_languages)
    ? ((task.supportedLanguages ?? task.supported_languages).length
      ? (task.supportedLanguages ?? task.supported_languages)
      : [task.language])
    : [task.language],
  isExecutable: Boolean(task.isExecutable ?? task.is_executable),
  executionProfile: task.executionProfile ?? task.execution_profile ?? 'pure',
  runnerMode: task.runnerMode ?? task.runner_mode ?? 'function_io',
  durationSeconds: Number(task.durationSeconds ?? task.duration_seconds ?? 1800),
  starterCode: task.starterCode ?? task.starter_code ?? '',
  codeTaskId: task.codeTaskId ?? task.code_task_id ?? '',
  referenceSolution: task.referenceSolution ?? task.reference_solution ?? '',
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
  solveLanguage: session.solveLanguage ?? session.solve_language ?? '',
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
    const now = Date.now();
    if (interviewPrepTasksCache.data && now - interviewPrepTasksCache.timestamp < interviewPrepTasksCache.ttlMs) {
      return interviewPrepTasksCache.data;
    }
    const response = await apiClient.get<{ tasks: any[] }>('/api/v1/interview-prep/tasks');
    const tasks = (response.data.tasks || []).map(normalizeTask);
    interviewPrepTasksCache.data = tasks;
    interviewPrepTasksCache.timestamp = now;
    return tasks;
  },

  startSession: async (taskId: string): Promise<InterviewPrepSession> => {
    const response = await apiClient.post<{ session: any }>('/api/v1/interview-prep/sessions', { taskId });
    return normalizeSession(response.data.session);
  },

  getSession: async (sessionId: string): Promise<InterviewPrepSession> => {
    const response = await apiClient.get<{ session: any }>(`/api/v1/interview-prep/sessions/${sessionId}`);
    return normalizeSession(response.data.session);
  },

  submit: async (sessionId: string, code: string, language: string): Promise<InterviewPrepSubmitResult> => {
    const response = await apiClient.post<any>(`/api/v1/interview-prep/sessions/${sessionId}/submit`, { code, language });
    const result = response.data.result;
    return {
      passed: Boolean(result?.passed ?? false),
      lastError: result?.lastError ?? '',
      passedCount: Number(result?.passedCount ?? result?.passed_count ?? 0),
      totalCount: Number(result?.totalCount ?? result?.total_count ?? 0),
      failedTestIndex: Number(result?.failedTestIndex ?? result?.failed_test_index ?? 0),
      failureKind: result?.failureKind ?? result?.failure_kind ?? '',
      session: result?.session ? normalizeSession(result.session) : undefined,
    };
  },

  answerQuestion: async (
    sessionId: string,
    questionId: string,
    selfAssessment: InterviewPrepSelfAssessment,
  ): Promise<InterviewPrepAnswerResult> => {
    const response = await apiClient.post<{ answeredQuestion?: any; session: any }>(
      `/api/v1/interview-prep/sessions/${sessionId}/questions/${questionId}/answer`,
      { selfAssessment },
    );
    return {
      answeredQuestion: response.data.answeredQuestion
        ? normalizeQuestion(response.data.answeredQuestion)
        : undefined,
      session: normalizeSession(response.data.session),
    };
  },

  reviewSystemDesign: async (
    sessionId: string,
    image: File,
    notes: string,
  ): Promise<InterviewPrepSystemDesignReview> => {
    const formData = new FormData();
    formData.append('image', image);
    formData.append('notes', notes);

    const response = await apiClient.post<{ review: InterviewPrepSystemDesignReview }>(
      `/api/v1/interview-prep/sessions/${sessionId}/system-design-review`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );

    return response.data.review;
  },

  // Admin methods
  adminListTasks: async (): Promise<InterviewPrepTask[]> => {
    const response = await apiClient.get<{ tasks: any[] }>('/api/admin/interview-prep/tasks');
    return (response.data.tasks || []).map(normalizeTask);
  },

  adminCreateTask: async (task: {
    slug: string;
    title: string;
    statement: string;
    prepType: string;
    language: string;
    companyTag?: string;
    supportedLanguages?: string[];
    isExecutable: boolean;
    executionProfile: string;
    runnerMode: string;
    durationSeconds: number;
    starterCode: string;
    codeTaskId?: string;
    referenceSolution: string;
    isActive: boolean;
  }): Promise<InterviewPrepTask> => {
    const response = await apiClient.post<{ task: any }>('/api/admin/interview-prep/tasks', task);
    interviewPrepTasksCache.data = null;
    interviewPrepTasksCache.timestamp = 0;
    return normalizeTask(response.data.task);
  },

  adminUpdateTask: async (taskId: string, task: {
    slug: string;
    title: string;
    statement: string;
    prepType: string;
    language: string;
    companyTag?: string;
    supportedLanguages?: string[];
    isExecutable: boolean;
    executionProfile: string;
    runnerMode: string;
    durationSeconds: number;
    starterCode: string;
    codeTaskId?: string;
    referenceSolution: string;
    isActive: boolean;
  }): Promise<InterviewPrepTask> => {
    const response = await apiClient.put<{ task: any }>(`/api/admin/interview-prep/tasks/${taskId}`, task);
    interviewPrepTasksCache.data = null;
    interviewPrepTasksCache.timestamp = 0;
    return normalizeTask(response.data.task);
  },

  adminDeleteTask: async (taskId: string): Promise<void> => {
    await apiClient.delete(`/api/admin/interview-prep/tasks/${taskId}`);
    interviewPrepTasksCache.data = null;
    interviewPrepTasksCache.timestamp = 0;
  },

  adminGetTask: async (taskId: string): Promise<InterviewPrepTask> => {
    const response = await apiClient.get<{ task: any }>(`/api/admin/interview-prep/tasks/${taskId}`);
    return normalizeTask(response.data.task);
  },

  adminListQuestions: async (taskId: string): Promise<InterviewPrepQuestion[]> => {
    const response = await apiClient.get<{ questions: any[] }>(`/api/admin/interview-prep/tasks/${taskId}/questions`);
    return (response.data.questions || []).map(normalizeQuestion);
  },

  adminCreateQuestion: async (taskId: string, question: {
    position: number;
    prompt: string;
    answer: string;
  }): Promise<InterviewPrepQuestion> => {
    const response = await apiClient.post<{ question: any }>(`/api/admin/interview-prep/tasks/${taskId}/questions`, question);
    return normalizeQuestion(response.data.question);
  },

  adminUpdateQuestion: async (taskId: string, questionId: string, question: {
    position: number;
    prompt: string;
    answer: string;
  }): Promise<InterviewPrepQuestion> => {
    const response = await apiClient.put<{ question: any }>(`/api/admin/interview-prep/tasks/${taskId}/questions/${questionId}`, question);
    return normalizeQuestion(response.data.question);
  },

  adminDeleteQuestion: async (taskId: string, questionId: string): Promise<void> => {
    await apiClient.delete(`/api/admin/interview-prep/tasks/${taskId}/questions/${questionId}`);
  },
};
