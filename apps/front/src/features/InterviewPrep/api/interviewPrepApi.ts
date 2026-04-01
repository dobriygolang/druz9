import { apiClient } from '@/shared/api/base';

export type InterviewPrepType =
  | 'coding'
  | 'algorithm'
  | 'system_design'
  | 'sql'
  | 'code_review';

export type InterviewPrepSessionStatus = 'active' | 'finished';
export type InterviewPrepSelfAssessment = 'answered' | 'skipped';


export interface InterviewPrepSystemDesignReview {
  strengths: string[];
  issues: string[];
  missingTopics: string[];
  followUpQuestions: string[];
  score?: number;
  provider?: string;
  model?: string;
  summary?: string;
  disclaimer?: string;
}

export interface InterviewPrepTask {
  id: string;
  slug: string;
  title: string;
  statement: string;
  prepType: InterviewPrepType;
  language: string;
  companyTag?: string;
  supportedLanguages?: string[];
  isExecutable: boolean;
  codeTaskId?: string;
  referenceSolution?: string;
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

export interface InterviewPrepSession {
  id: string;
  userId: string;
  taskId: string;
  status: InterviewPrepSessionStatus;
  currentQuestionPosition: number;
  code: string;
  solveLanguage?: string;
  results?: any[];
  answeredQuestion?: InterviewPrepQuestion;
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
  passedCount: number;
  totalCount: number;
  failedTestIndex: number;
  failureKind: string;
  lastError: string;
  session?: InterviewPrepSession;
}

const normalizeTask = (task: any): InterviewPrepTask => ({
  id: task.id ?? task.ID,
  slug: task.slug ?? task.Slug,
  title: task.title ?? task.Title,
  statement: task.statement ?? task.Statement,
  prepType: task.prepType ?? task.prep_type ?? task.PrepType,
  language: task.language ?? task.Language,
  companyTag: task.companyTag ?? task.company_tag ?? task.CompanyTag,
  supportedLanguages: task.supportedLanguages ?? task.supported_languages ?? task.SupportedLanguages,
  codeTaskId: task.codeTaskId ?? task.code_task_id ?? task.CodeTaskID,
  referenceSolution: task.referenceSolution ?? task.reference_solution ?? task.ReferenceSolution,
  isExecutable: Boolean(task.isExecutable ?? task.is_executable ?? task.IsExecutable),
  executionProfile: task.executionProfile ?? task.execution_profile ?? task.ExecutionProfile ?? 'pure',
  runnerMode: task.runnerMode ?? task.runner_mode ?? task.RunnerMode ?? 'function_io',
  durationSeconds: Number(task.durationSeconds ?? task.duration_seconds ?? task.DurationSeconds ?? 1800),
  starterCode: task.starterCode ?? task.starter_code ?? task.StarterCode ?? '',
  isActive: Boolean(task.isActive ?? task.is_active ?? task.IsActive),
  createdAt: task.createdAt ?? task.created_at ?? task.CreatedAt,
  updatedAt: task.updatedAt ?? task.updated_at ?? task.UpdatedAt,
});

const normalizeQuestion = (question: any): InterviewPrepQuestion => ({
  id: question.id ?? question.ID,
  taskId: question.taskId ?? question.task_id ?? question.TaskID,
  position: Number(question.position ?? question.Position ?? 0),
  prompt: question.prompt ?? question.Prompt ?? '',
  answer: question.answer ?? question.Answer ?? '',
  createdAt: question.createdAt ?? question.created_at ?? question.CreatedAt,
  updatedAt: question.updatedAt ?? question.updated_at ?? question.UpdatedAt,
});

const normalizeSession = (session: any): InterviewPrepSession => ({
  id: session.id ?? session.ID,
  userId: session.userId ?? session.user_id ?? session.UserID,
  taskId: session.taskId ?? session.task_id ?? session.TaskID,
  status: session.status ?? session.Status,
  currentQuestionPosition: Number(session.currentQuestionPosition ?? session.current_question_position ?? session.CurrentQuestionPosition ?? 0),
  code: session.code ?? session.Code ?? '',
  solveLanguage: session.solveLanguage ?? session.solve_language ?? session.SolveLanguage,
  results: session.results,
  lastSubmissionPassed: Boolean(session.lastSubmissionPassed ?? session.last_submission_passed ?? session.LastSubmissionPassed),
  startedAt: session.startedAt ?? session.started_at ?? session.StartedAt,
  finishedAt: session.finishedAt ?? session.finished_at ?? session.FinishedAt,
  createdAt: session.createdAt ?? session.created_at ?? session.CreatedAt,
  updatedAt: session.updatedAt ?? session.updated_at ?? session.UpdatedAt,
  task: session.task || session.Task ? normalizeTask(session.task ?? session.Task) : undefined,
  currentQuestion: session.currentQuestion || session.current_question || session.CurrentQuestion
    ? normalizeQuestion(session.currentQuestion ?? session.current_question ?? session.CurrentQuestion)
    : undefined,
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

  submit: async (sessionId: string, code: string, solveLanguage?: string): Promise<InterviewPrepSubmitResult> => {
    const response = await apiClient.post<any>(`/api/v1/interview-prep/sessions/${sessionId}/submit`, { code, language: solveLanguage });
    const result = response.data.result;
    return {
      passed: Boolean(result?.passed ?? false),
      passedCount: result?.passedCount ?? 0,
      totalCount: result?.totalCount ?? 0,
      failedTestIndex: result?.failedTestIndex ?? -1,
      failureKind: result?.failureKind ?? '',
      lastError: result?.lastError ?? '',
      session: result?.session ? normalizeSession(result.session) : undefined,
    };
  },

  
  answerQuestion: async (
    sessionId: string,
    questionId: string,
    selfAssessment: InterviewPrepSelfAssessment,
  ): Promise<{ session: InterviewPrepSession; answeredQuestion?: InterviewPrepQuestion }> => {
    const response = await apiClient.post<{ session: any; answeredQuestion?: any }>(
      `/api/v1/interview-prep/sessions/${sessionId}/questions/${questionId}/answer`,
      { selfAssessment },
    );
    return {
      session: normalizeSession(response.data.session),
      answeredQuestion: response.data.answeredQuestion ? normalizeQuestion(response.data.answeredQuestion) : undefined,
    };
  },


  reviewSystemDesign: async (sessionId: string, image: File, notes: string): Promise<InterviewPrepSystemDesignReview> => {
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
    return normalizeTask(response.data.task);
  },

  adminDeleteTask: async (taskId: string): Promise<void> => {
    await apiClient.delete(`/api/admin/interview-prep/tasks/${taskId}`);
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
