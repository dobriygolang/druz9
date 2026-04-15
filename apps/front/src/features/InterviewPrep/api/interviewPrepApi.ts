import { apiClient } from '@/shared/api/base'

export interface InterviewPrepTask {
  id: string
  slug: string
  title: string
  statement: string
  prepType: string
  language: string
  companyTag: string
  supportedLanguages: string[]
  isExecutable: boolean
  durationSeconds: number
  starterCode: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface MockBlueprint {
  id: string
  trackSlug: string
  slug: string
  title: string
  description: string
  level: string
  totalDurationSeconds: number
  publicAliasSlugs: string[]
  publicAliasNames: string[]
  introText: string
  primaryAliasSlug: string
  primaryAliasName: string
  rounds: MockBlueprintRound[]
}

export interface MockBlueprintRound {
  position: number
  roundType: string
  title: string
  durationSeconds: number
  evaluatorMode: string
  candidateInstructions: string
}

type BackendTask = {
  id: string; slug?: string; title?: string; statement?: string; prepType?: string; language?: string
  companyTag?: string; supportedLanguages?: string[]; isExecutable?: boolean; durationSeconds?: number
  starterCode?: string; isActive?: boolean; createdAt?: string; updatedAt?: string
}

/** Invert a Record<K,V> into Record<V,K> — single source of truth for bidirectional maps */
function invertMap(map: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(map).map(([k, v]) => [v, k]))
}

const LANGUAGE_ENUM_TO_FRIENDLY: Record<string, string> = {
  PROGRAMMING_LANGUAGE_JAVASCRIPT: 'javascript',
  PROGRAMMING_LANGUAGE_TYPESCRIPT: 'typescript',
  PROGRAMMING_LANGUAGE_PYTHON: 'python',
  PROGRAMMING_LANGUAGE_GO: 'go',
  PROGRAMMING_LANGUAGE_RUST: 'rust',
  PROGRAMMING_LANGUAGE_CPP: 'cpp',
  PROGRAMMING_LANGUAGE_JAVA: 'java',
  PROGRAMMING_LANGUAGE_SQL: 'sql',
}

const LANGUAGE_FRIENDLY_TO_ENUM = invertMap(LANGUAGE_ENUM_TO_FRIENDLY)

const PREP_TYPE_ENUM_TO_FRIENDLY: Record<string, string> = {
  PREP_TYPE_CODING: 'coding',
  PREP_TYPE_ALGORITHM: 'algorithm',
  PREP_TYPE_SYSTEM_DESIGN: 'system_design',
  PREP_TYPE_SQL: 'sql',
  PREP_TYPE_CODE_REVIEW: 'code_review',
  PREP_TYPE_BEHAVIORAL: 'behavioral',
}

const SELF_ASSESSMENT_FRIENDLY_TO_ENUM: Record<string, string> = {
  answered: 'SELF_ASSESSMENT_ANSWERED',
  skipped: 'SELF_ASSESSMENT_SKIPPED',
}

function toLanguageEnum(lang: string): string {
  return LANGUAGE_FRIENDLY_TO_ENUM[lang] ?? lang
}

function fromLanguageEnum(lang: string): string {
  return LANGUAGE_ENUM_TO_FRIENDLY[lang] ?? lang
}

function fromPrepTypeEnum(t: string): string {
  return PREP_TYPE_ENUM_TO_FRIENDLY[t] ?? t
}

function toSelfAssessmentEnum(s: string): string {
  return SELF_ASSESSMENT_FRIENDLY_TO_ENUM[s] ?? s
}

function normalizeTask(t: BackendTask): InterviewPrepTask {
  return {
    id: t.id, slug: t.slug ?? '', title: t.title ?? '', statement: t.statement ?? '',
    prepType: fromPrepTypeEnum(t.prepType ?? ''),
    language: fromLanguageEnum(t.language ?? ''),
    companyTag: t.companyTag ?? '',
    supportedLanguages: t.supportedLanguages ?? [], isExecutable: t.isExecutable ?? false,
    durationSeconds: t.durationSeconds ?? 0, starterCode: t.starterCode ?? '',
    isActive: t.isActive ?? true, createdAt: t.createdAt ?? '', updatedAt: t.updatedAt ?? '',
  }
}

/** Normalize session object returned by backend: convert proto enum strings in nested task. */
function normalizeSession(s: any): any {
  if (!s) return s
  return {
    ...s,
    task: s.task ? normalizeTask(s.task) : s.task,
  }
}

function normalizeMockStage(stage: any): any {
  if (!stage) return stage
  return {
    ...stage,
    task: stage.task ? normalizeTask(stage.task) : stage.task,
  }
}

function normalizeMockSession(session: any): any {
  if (!session) return session
  return {
    ...session,
    stages: Array.isArray(session.stages) ? session.stages.map(normalizeMockStage) : session.stages,
    currentStage: session.currentStage ? normalizeMockStage(session.currentStage) : session.currentStage,
  }
}

function normalizeMockEnvelopeResult(payload: any) {
  if (!payload) return payload
  return {
    ...payload,
    session: normalizeMockSession(payload.session),
  }
}

export interface SystemDesignPayload {
  image?: Uint8Array | string
  imageName?: string
  imageContentType?: string
  notes?: string
  components?: string
  apis?: string
  databaseSchema?: string
  traffic?: string
  reliability?: string
}

export const interviewPrepApi = {
  listTasks: async (): Promise<InterviewPrepTask[]> => {
    const r = await apiClient.get<{ tasks?: BackendTask[] }>('/api/v1/interview-prep/tasks')
    return (r.data.tasks ?? []).map(normalizeTask)
  },
  listMockBlueprints: async (): Promise<MockBlueprint[]> => {
    const r = await apiClient.get<{ blueprints?: MockBlueprint[] }>('/api/v1/interview-prep/mock-blueprints')
    return r.data.blueprints ?? []
  },
  startSession: async (taskId: string) => {
    const r = await apiClient.post<{ session?: unknown }>('/api/v1/interview-prep/sessions', { taskId })
    return normalizeSession(r.data.session)
  },
  getSession: async (sessionId: string) => {
    const r = await apiClient.get<{ session?: unknown }>(`/api/v1/interview-prep/sessions/${sessionId}`)
    return normalizeSession(r.data.session)
  },
  submitSession: async (sessionId: string, code: string, language: string) => {
    const r = await apiClient.post<{ result?: unknown }>(`/api/v1/interview-prep/sessions/${sessionId}/submit`, {
      code,
      language: toLanguageEnum(language),
    })
    return r.data.result
  },
  answerQuestion: async (sessionId: string, questionId: string, answer: string, selfAssessment: string) => {
    const r = await apiClient.post<{ session?: unknown; review?: unknown }>(
      `/api/v1/interview-prep/sessions/${sessionId}/questions/${questionId}/answer`,
      { answer, selfAssessment: toSelfAssessmentEnum(selfAssessment) },
    )
    return { ...r.data, session: normalizeSession(r.data.session) }
  },
  listCompanies: async (): Promise<string[]> => {
    const r = await apiClient.get<{ companies?: string[] }>('/api/v1/interview-prep/companies')
    return r.data.companies ?? []
  },
  startMockSession: async (params: { companyTag?: string; programSlug?: string }) => {
    const r = await apiClient.post<{ session?: unknown }>('/api/v1/interview-prep/mock-sessions', {
      companyTag: params.companyTag ?? '',
      programSlug: params.programSlug ?? '',
    })
    return normalizeMockSession(r.data.session)
  },
  getMockSession: async (sessionId: string) => {
    const r = await apiClient.get<{ session?: unknown }>(`/api/v1/interview-prep/mock-sessions/${sessionId}`)
    return normalizeMockSession(r.data.session)
  },
  submitMockSession: async (sessionId: string, code: string, language: string, notes?: string, stageKind?: string) => {
    const r = await apiClient.post<{ result?: unknown; review?: unknown; session?: unknown }>(
      `/api/v1/interview-prep/mock-sessions/${sessionId}/submit`,
      { code, language: toLanguageEnum(language), notes, stageKind: stageKind ?? 'MOCK_STAGE_KIND_UNSPECIFIED' },
    )
    const raw = r.data as any
    return {
      ...raw,
      session: normalizeMockSession(raw?.session),
      result: raw?.result ? normalizeMockEnvelopeResult(raw.result) : undefined,
    }
  },
  answerMockQuestion: async (sessionId: string, answer: string) => {
    const r = await apiClient.post<{ result?: unknown; review?: unknown; session?: unknown }>(
      `/api/v1/interview-prep/mock-sessions/${sessionId}/questions/answer`,
      { answer },
    )
    const raw = r.data as any
    if (raw?.result) return normalizeMockEnvelopeResult(raw.result)
    return { ...raw, session: normalizeMockSession(raw.session) }
  },
  submitSystemDesignReview: async (sessionId: string, design: SystemDesignPayload) => {
    const r = await apiClient.post<{ review?: unknown }>(
      `/api/v1/interview-prep/sessions/${sessionId}/system-design-review`,
      { design },
    )
    return r.data.review
  },
  submitMockSystemDesignReview: async (sessionId: string, design: SystemDesignPayload) => {
    const r = await apiClient.post<{ result?: unknown; review?: unknown; session?: unknown }>(
      `/api/v1/interview-prep/mock-sessions/${sessionId}/system-design-review`,
      { design },
    )
    const raw = r.data as any
    if (raw?.result) return normalizeMockEnvelopeResult(raw.result)
    return { ...raw, session: normalizeMockSession(raw.session) }
  },
  abortMockSession: async (sessionId: string): Promise<void> => {
    await apiClient.post(`/api/v1/interview-prep/mock-sessions/${sessionId}/abort`)
  },
}
