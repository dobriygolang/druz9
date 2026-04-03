import { apiClient } from '@/shared/api/base';
import { getCachedValue, invalidateCachedPrefix, setCachedValue } from '@/shared/api/cache';

export type InterviewPrepType =
  | 'coding'
  | 'algorithm'
  | 'system_design'
  | 'sql'
  | 'code_review'
  | 'unspecified';

export type InterviewPrepSessionStatus = 'active' | 'finished' | 'unspecified';
export type InterviewPrepSelfAssessment = 'answered' | 'skipped' | 'unspecified';
export type InterviewPrepMockStageKind = 'slices' | 'concurrency' | 'sql' | 'architecture' | 'system_design' | 'unspecified';
export type InterviewPrepMockStageStatus = 'pending' | 'solving' | 'questions' | 'completed' | 'unspecified';
export type InterviewPrepCheckpointStatus = 'active' | 'passed' | 'failed' | 'expired' | 'unspecified';


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

export interface InterviewPrepSystemDesignReviewInput {
  notes: string;
  components: string;
  apis: string;
  databaseSchema: string;
  traffic: string;
  reliability: string;
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

export interface InterviewPrepQuestionAnswerResult {
  session: InterviewPrepSession;
  answeredQuestion?: InterviewPrepQuestion;
  review?: InterviewPrepAnswerReview;
}

export interface InterviewPrepMockQuestionResult {
  id: string;
  stageId: string;
  position: number;
  questionKey: string;
  prompt: string;
  score: number;
  summary: string;
  answeredAt?: string;
}

export interface InterviewPrepMockStage {
  id: string;
  sessionId: string;
  stageIndex: number;
  kind: InterviewPrepMockStageKind;
  status: InterviewPrepMockStageStatus;
  taskId: string;
  solveLanguage: string;
  code: string;
  lastSubmissionPassed: boolean;
  reviewScore: number;
  reviewSummary: string;
  startedAt: string;
  finishedAt?: string;
  createdAt: string;
  updatedAt: string;
  task?: InterviewPrepTask;
  currentQuestion?: InterviewPrepMockQuestionResult;
  questionResults?: InterviewPrepMockQuestionResult[];
}

export interface InterviewPrepMockSession {
  id: string;
  userId: string;
  companyTag: string;
  status: InterviewPrepSessionStatus;
  currentStageIndex: number;
  startedAt: string;
  finishedAt?: string;
  createdAt: string;
  updatedAt: string;
  stages?: InterviewPrepMockStage[];
  currentStage?: InterviewPrepMockStage;
}

export interface InterviewPrepSolutionReview {
  provider?: string;
  model?: string;
  score: number;
  summary: string;
  strengths: string[];
  issues: string[];
  followUpQuestions: string[];
}

export interface InterviewPrepAnswerReview {
  provider?: string;
  model?: string;
  score: number;
  summary: string;
  gaps: string[];
}

export interface InterviewPrepMockSubmitResult {
  passed: boolean;
  passedCount: number;
  totalCount: number;
  failedTestIndex: number;
  failureKind: string;
  lastError: string;
  review?: InterviewPrepSolutionReview;
  session?: InterviewPrepMockSession;
}

export interface InterviewPrepMockQuestionAnswerResult {
  review?: InterviewPrepAnswerReview;
  session?: InterviewPrepMockSession;
}

export interface InterviewPrepMockQuestionPoolItem {
  id: string;
  topic: string;
  companyTag: string;
  questionKey: string;
  prompt: string;
  referenceAnswer: string;
  position: number;
  alwaysAsk: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface InterviewPrepMockCompanyPreset {
  id: string;
  companyTag: string;
  stageKind: InterviewPrepMockStageKind;
  position: number;
  taskSlugPattern: string;
  aiModelOverride: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface InterviewPrepCheckpoint {
  id: string;
  userId: string;
  taskId: string;
  sessionId: string;
  skillKey: string;
  status: InterviewPrepCheckpointStatus;
  durationSeconds: number;
  attemptsUsed: number;
  maxAttempts: number;
  score: number;
  startedAt: string;
  finishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const normalizeTask = (task: any): InterviewPrepTask => ({
  id: task.id ?? task.ID,
  slug: task.slug ?? task.Slug,
  title: task.title ?? task.Title,
  statement: task.statement ?? task.Statement,
  prepType: task.prepType ?? task.prep_type ?? task.PrepType ?? 'unspecified',
  language: task.language ?? task.Language,
  companyTag: task.companyTag ?? task.company_tag ?? task.CompanyTag,
  supportedLanguages: task.supportedLanguages ?? task.supported_languages ?? task.SupportedLanguages,
  codeTaskId: task.codeTaskId ?? task.code_task_id ?? task.CodeTaskID,
  referenceSolution: task.referenceSolution ?? task.reference_solution ?? task.ReferenceSolution,
  isExecutable: Boolean(task.isExecutable ?? task.is_executable ?? task.IsExecutable),
  executionProfile: task.executionProfile ?? task.execution_profile ?? task.ExecutionProfile ?? '',
  runnerMode: task.runnerMode ?? task.runner_mode ?? task.RunnerMode ?? '',
  durationSeconds: Number(task.durationSeconds ?? task.duration_seconds ?? task.DurationSeconds ?? 0),
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
  status: session.status ?? session.Status ?? 'unspecified',
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

const normalizeMockQuestionResult = (item: any): InterviewPrepMockQuestionResult => ({
  id: item.id ?? item.ID,
  stageId: item.stageId ?? item.stage_id ?? item.StageID,
  position: Number(item.position ?? item.Position ?? 0),
  questionKey: item.questionKey ?? item.question_key ?? item.QuestionKey ?? '',
  prompt: item.prompt ?? item.Prompt ?? '',
  score: Number(item.score ?? item.Score ?? 0),
  summary: item.summary ?? item.Summary ?? '',
  answeredAt: item.answeredAt ?? item.answered_at ?? item.AnsweredAt,
});

const normalizeMockStage = (stage: any): InterviewPrepMockStage => ({
  id: stage.id ?? stage.ID,
  sessionId: stage.sessionId ?? stage.session_id ?? stage.SessionID,
  stageIndex: Number(stage.stageIndex ?? stage.stage_index ?? stage.StageIndex ?? 0),
  kind: stage.kind ?? stage.Kind ?? 'unspecified',
  status: stage.status ?? stage.Status ?? 'unspecified',
  taskId: stage.taskId ?? stage.task_id ?? stage.TaskID,
  solveLanguage: stage.solveLanguage ?? stage.solve_language ?? stage.SolveLanguage ?? '',
  code: stage.code ?? stage.Code ?? '',
  lastSubmissionPassed: Boolean(stage.lastSubmissionPassed ?? stage.last_submission_passed ?? stage.LastSubmissionPassed),
  reviewScore: Number(stage.reviewScore ?? stage.review_score ?? stage.ReviewScore ?? 0),
  reviewSummary: stage.reviewSummary ?? stage.review_summary ?? stage.ReviewSummary ?? '',
  startedAt: stage.startedAt ?? stage.started_at ?? stage.StartedAt,
  finishedAt: stage.finishedAt ?? stage.finished_at ?? stage.FinishedAt,
  createdAt: stage.createdAt ?? stage.created_at ?? stage.CreatedAt,
  updatedAt: stage.updatedAt ?? stage.updated_at ?? stage.UpdatedAt,
  task: stage.task || stage.Task ? normalizeTask(stage.task ?? stage.Task) : undefined,
  currentQuestion: stage.currentQuestion || stage.current_question || stage.CurrentQuestion
    ? normalizeMockQuestionResult(stage.currentQuestion ?? stage.current_question ?? stage.CurrentQuestion)
    : undefined,
  questionResults: (stage.questionResults ?? stage.question_results ?? stage.QuestionResults ?? []).map(normalizeMockQuestionResult),
});

const normalizeMockSession = (session: any): InterviewPrepMockSession => ({
  id: session.id ?? session.ID,
  userId: session.userId ?? session.user_id ?? session.UserID,
  companyTag: session.companyTag ?? session.company_tag ?? session.CompanyTag ?? '',
  status: session.status ?? session.Status ?? 'unspecified',
  currentStageIndex: Number(session.currentStageIndex ?? session.current_stage_index ?? session.CurrentStageIndex ?? 0),
  startedAt: session.startedAt ?? session.started_at ?? session.StartedAt,
  finishedAt: session.finishedAt ?? session.finished_at ?? session.FinishedAt,
  createdAt: session.createdAt ?? session.created_at ?? session.CreatedAt,
  updatedAt: session.updatedAt ?? session.updated_at ?? session.UpdatedAt,
  stages: (session.stages ?? session.Stages ?? []).map(normalizeMockStage),
  currentStage: session.currentStage || session.current_stage || session.CurrentStage
    ? normalizeMockStage(session.currentStage ?? session.current_stage ?? session.CurrentStage)
    : undefined,
});

const normalizeMockQuestionPoolItem = (item: any): InterviewPrepMockQuestionPoolItem => ({
  id: item.id ?? item.ID,
  topic: item.topic ?? item.Topic ?? '',
  companyTag: item.companyTag ?? item.company_tag ?? item.CompanyTag ?? '',
  questionKey: item.questionKey ?? item.question_key ?? item.QuestionKey ?? '',
  prompt: item.prompt ?? item.Prompt ?? '',
  referenceAnswer: item.referenceAnswer ?? item.reference_answer ?? item.ReferenceAnswer ?? '',
  position: Number(item.position ?? item.Position ?? 0),
  alwaysAsk: Boolean(item.alwaysAsk ?? item.always_ask ?? item.AlwaysAsk),
  isActive: Boolean(item.isActive ?? item.is_active ?? item.IsActive),
  createdAt: item.createdAt ?? item.created_at ?? item.CreatedAt,
  updatedAt: item.updatedAt ?? item.updated_at ?? item.UpdatedAt,
});

const normalizeMockCompanyPreset = (item: any): InterviewPrepMockCompanyPreset => ({
  id: item.id ?? item.ID,
  companyTag: item.companyTag ?? item.company_tag ?? item.CompanyTag ?? '',
  stageKind: item.stageKind ?? item.stage_kind ?? item.StageKind,
  position: Number(item.position ?? item.Position ?? 0),
  taskSlugPattern: item.taskSlugPattern ?? item.task_slug_pattern ?? item.TaskSlugPattern ?? '',
  aiModelOverride: item.aiModelOverride ?? item.ai_model_override ?? item.AIModelOverride ?? '',
  isActive: Boolean(item.isActive ?? item.is_active ?? item.IsActive),
  createdAt: item.createdAt ?? item.created_at ?? item.CreatedAt,
  updatedAt: item.updatedAt ?? item.updated_at ?? item.UpdatedAt,
});

const normalizeCheckpoint = (item: any): InterviewPrepCheckpoint => ({
  id: item.id ?? item.ID,
  userId: item.userId ?? item.user_id ?? item.UserID,
  taskId: item.taskId ?? item.task_id ?? item.TaskID,
  sessionId: item.sessionId ?? item.session_id ?? item.SessionID,
  skillKey: item.skillKey ?? item.skill_key ?? item.SkillKey ?? '',
  status: item.status ?? item.Status ?? 'unspecified',
  durationSeconds: Number(item.durationSeconds ?? item.duration_seconds ?? item.DurationSeconds ?? 0),
  attemptsUsed: Number(item.attemptsUsed ?? item.attempts_used ?? item.AttemptsUsed ?? 0),
  maxAttempts: Number(item.maxAttempts ?? item.max_attempts ?? item.MaxAttempts ?? 0),
  score: Number(item.score ?? item.Score ?? 0),
  startedAt: item.startedAt ?? item.started_at ?? item.StartedAt,
  finishedAt: item.finishedAt ?? item.finished_at ?? item.FinishedAt,
  createdAt: item.createdAt ?? item.created_at ?? item.CreatedAt,
  updatedAt: item.updatedAt ?? item.updated_at ?? item.UpdatedAt,
});

const fileToBase64 = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
};

export const interviewPrepApi = {
  listTasks: async (): Promise<InterviewPrepTask[]> => {
    const cacheKey = 'interview-prep:tasks';
    const cached = getCachedValue<InterviewPrepTask[]>(cacheKey);
    if (cached) {
      return cached;
    }
    const response = await apiClient.get<{ tasks: any[] }>('/api/v1/interview-prep/tasks');
    const tasks = (response.data.tasks || []).map(normalizeTask);
    setCachedValue(cacheKey, tasks, 120_000);
    return tasks;
  },

  startSession: async (taskId: string): Promise<InterviewPrepSession> => {
    const response = await apiClient.post<{ session: any }>('/api/v1/interview-prep/sessions', { taskId });
    const session = normalizeSession(response.data.session);
    invalidateCachedPrefix('interview-prep:tasks');
    setCachedValue(`interview-prep:session:${session.id}`, session, 15_000);
    return session;
  },

  getSession: async (sessionId: string): Promise<InterviewPrepSession> => {
    const cacheKey = `interview-prep:session:${sessionId}`;
    const cached = getCachedValue<InterviewPrepSession>(cacheKey);
    if (cached) {
      return cached;
    }
    const response = await apiClient.get<{ session: any }>(`/api/v1/interview-prep/sessions/${sessionId}`);
    const session = normalizeSession(response.data.session);
    setCachedValue(cacheKey, session, 15_000);
    return session;
  },

  startCheckpoint: async (taskId: string): Promise<{ session: InterviewPrepSession; checkpoint: InterviewPrepCheckpoint }> => {
    const response = await apiClient.post<{ session: any; checkpoint: any }>(
      '/api/v1/interview-prep/checkpoints/start',
      { task_id: taskId },
    );
    const session = normalizeSession(response.data.session);
    const checkpoint = normalizeCheckpoint(response.data.checkpoint);
    setCachedValue(`interview-prep:session:${session.id}`, session, 15_000);
    setCachedValue(`interview-prep:checkpoint:${session.id}`, checkpoint, 10_000);
    return { session, checkpoint };
  },

  getCheckpoint: async (sessionId: string): Promise<InterviewPrepCheckpoint> => {
    const cacheKey = `interview-prep:checkpoint:${sessionId}`;
    const cached = getCachedValue<InterviewPrepCheckpoint>(cacheKey);
    if (cached) {
      return cached;
    }
    const response = await apiClient.get<{ checkpoint: any }>(`/api/v1/interview-prep/checkpoints/session/${sessionId}`);
    const checkpoint = normalizeCheckpoint(response.data.checkpoint);
    setCachedValue(cacheKey, checkpoint, 10_000);
    return checkpoint;
  },

  submit: async (sessionId: string, code: string, solveLanguage?: string): Promise<InterviewPrepSubmitResult> => {
    const response = await apiClient.post<any>(`/api/v1/interview-prep/sessions/${sessionId}/submit`, { code, language: solveLanguage });
    const result = response.data.result;
    if (result?.session) {
      setCachedValue(`interview-prep:session:${sessionId}`, normalizeSession(result.session), 15_000);
    } else {
      invalidateCachedPrefix(`interview-prep:session:${sessionId}`);
    }
    invalidateCachedPrefix(`interview-prep:checkpoint:${sessionId}`);
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
    answer?: string,
  ): Promise<InterviewPrepQuestionAnswerResult> => {
    const response = await apiClient.post<{ session: any; answeredQuestion?: any; review?: InterviewPrepAnswerReview }>(
      `/api/v1/interview-prep/sessions/${sessionId}/questions/${questionId}/answer`,
      { selfAssessment, answer },
    );
    const session = normalizeSession(response.data.session);
    setCachedValue(`interview-prep:session:${sessionId}`, session, 15_000);
    return {
      session,
      answeredQuestion: response.data.answeredQuestion ? normalizeQuestion(response.data.answeredQuestion) : undefined,
      review: response.data.review,
    };
  },


  reviewSystemDesign: async (sessionId: string, image: File, input: InterviewPrepSystemDesignReviewInput): Promise<InterviewPrepSystemDesignReview> => {
    const imageBase64 = await fileToBase64(image);

    const response = await apiClient.post<{ review: InterviewPrepSystemDesignReview }>(
      `/api/v1/interview-prep/sessions/${sessionId}/system-design-review`,
      {
        image: imageBase64,
        imageName: image.name,
        imageContentType: image.type || 'application/octet-stream',
        notes: input.notes,
        components: input.components,
        apis: input.apis,
        databaseSchema: input.databaseSchema,
        traffic: input.traffic,
        reliability: input.reliability,
      },
    );

    return response.data.review;
  },

  startMockSession: async (companyTag: string): Promise<InterviewPrepMockSession> => {
    const response = await apiClient.post<{ session: any }>('/api/v1/interview-prep/mock-sessions', { companyTag });
    return normalizeMockSession(response.data.session);
  },

  getAvailableCompanies: async (): Promise<string[]> => {
    const response = await apiClient.get<{ companies: string[] }>('/api/v1/interview-prep/companies');
    return response.data.companies || [];
  },

  getMockSession: async (sessionId: string): Promise<InterviewPrepMockSession> => {
    const response = await apiClient.get<{ session: any }>(`/api/v1/interview-prep/mock-sessions/${sessionId}`);
    return normalizeMockSession(response.data.session);
  },

  submitMockStage: async (sessionId: string, payload: { code: string; language?: string; notes?: string }): Promise<InterviewPrepMockSubmitResult> => {
    const response = await apiClient.post<{ result: any }>(`/api/v1/interview-prep/mock-sessions/${sessionId}/submit`, payload);
    const result = response.data.result;
    return {
      passed: Boolean(result?.passed ?? false),
      passedCount: Number(result?.passedCount ?? 0),
      totalCount: Number(result?.totalCount ?? 0),
      failedTestIndex: Number(result?.failedTestIndex ?? -1),
      failureKind: result?.failureKind ?? '',
      lastError: result?.lastError ?? '',
      review: result?.review,
      session: result?.session ? normalizeMockSession(result.session) : undefined,
    };
  },

  reviewMockSystemDesign: async (
    sessionId: string,
    image: File,
    input: InterviewPrepSystemDesignReviewInput,
  ): Promise<{ review?: InterviewPrepSystemDesignReview; session?: InterviewPrepMockSession }> => {
    const imageBase64 = await fileToBase64(image);

    const response = await apiClient.post<{ result: { review?: InterviewPrepSystemDesignReview; session?: any } }>(
      `/api/v1/interview-prep/mock-sessions/${sessionId}/system-design-review`,
      {
        image: imageBase64,
        imageName: image.name,
        imageContentType: image.type || 'application/octet-stream',
        notes: input.notes,
        components: input.components,
        apis: input.apis,
        databaseSchema: input.databaseSchema,
        traffic: input.traffic,
        reliability: input.reliability,
      },
    );
    return {
      review: response.data.result.review,
      session: response.data.result.session ? normalizeMockSession(response.data.result.session) : undefined,
    };
  },

  answerMockQuestion: async (sessionId: string, answer: string): Promise<InterviewPrepMockQuestionAnswerResult> => {
    const response = await apiClient.post<{ result: { review?: InterviewPrepAnswerReview; session?: any } }>(
      `/api/v1/interview-prep/mock-sessions/${sessionId}/questions/answer`,
      { answer },
    );
    return {
      review: response.data.result.review,
      session: response.data.result.session ? normalizeMockSession(response.data.result.session) : undefined,
    };
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

  adminListMockQuestionPools: async (): Promise<InterviewPrepMockQuestionPoolItem[]> => {
    const response = await apiClient.get<{ items: any[] }>('/api/admin/interview-prep/mock-question-pools');
    return (response.data.items || []).map(normalizeMockQuestionPoolItem);
  },

  adminCreateMockQuestionPool: async (item: Omit<InterviewPrepMockQuestionPoolItem, 'id'>): Promise<InterviewPrepMockQuestionPoolItem> => {
    const response = await apiClient.post<{ item: any }>('/api/admin/interview-prep/mock-question-pools', item);
    return normalizeMockQuestionPoolItem(response.data.item);
  },

  adminUpdateMockQuestionPool: async (id: string, item: Omit<InterviewPrepMockQuestionPoolItem, 'id'>): Promise<InterviewPrepMockQuestionPoolItem> => {
    const response = await apiClient.put<{ item: any }>(`/api/admin/interview-prep/mock-question-pools/${id}`, item);
    return normalizeMockQuestionPoolItem(response.data.item);
  },

  adminDeleteMockQuestionPool: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/admin/interview-prep/mock-question-pools/${id}`);
  },

  adminListMockCompanyPresets: async (): Promise<InterviewPrepMockCompanyPreset[]> => {
    const response = await apiClient.get<{ items: any[] }>('/api/admin/interview-prep/mock-company-presets');
    return (response.data.items || []).map(normalizeMockCompanyPreset);
  },

  adminCreateMockCompanyPreset: async (item: Omit<InterviewPrepMockCompanyPreset, 'id'>): Promise<InterviewPrepMockCompanyPreset> => {
    const response = await apiClient.post<{ item: any }>('/api/admin/interview-prep/mock-company-presets', item);
    return normalizeMockCompanyPreset(response.data.item);
  },

  adminUpdateMockCompanyPreset: async (id: string, item: Omit<InterviewPrepMockCompanyPreset, 'id'>): Promise<InterviewPrepMockCompanyPreset> => {
    const response = await apiClient.put<{ item: any }>(`/api/admin/interview-prep/mock-company-presets/${id}`, item);
    return normalizeMockCompanyPreset(response.data.item);
  },

  adminDeleteMockCompanyPreset: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/admin/interview-prep/mock-company-presets/${id}`);
  },
};
