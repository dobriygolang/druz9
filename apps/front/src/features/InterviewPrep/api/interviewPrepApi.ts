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

type BackendTask = {
  id: string; slug?: string; title?: string; statement?: string; prepType?: string; language?: string
  companyTag?: string; supportedLanguages?: string[]; isExecutable?: boolean; durationSeconds?: number
  starterCode?: string; isActive?: boolean; createdAt?: string; updatedAt?: string
}

function normalizeTask(t: BackendTask): InterviewPrepTask {
  return {
    id: t.id, slug: t.slug ?? '', title: t.title ?? '', statement: t.statement ?? '',
    prepType: t.prepType ?? '', language: t.language ?? '', companyTag: t.companyTag ?? '',
    supportedLanguages: t.supportedLanguages ?? [], isExecutable: t.isExecutable ?? false,
    durationSeconds: t.durationSeconds ?? 0, starterCode: t.starterCode ?? '',
    isActive: t.isActive ?? true, createdAt: t.createdAt ?? '', updatedAt: t.updatedAt ?? '',
  }
}

export const interviewPrepApi = {
  listTasks: async (): Promise<InterviewPrepTask[]> => {
    const r = await apiClient.get<{ tasks?: BackendTask[] }>('/api/v1/interview-prep/tasks')
    return (r.data.tasks ?? []).map(normalizeTask)
  },
  startSession: async (taskId: string) => {
    const r = await apiClient.post<{ session?: unknown }>('/api/v1/interview-prep/sessions', { taskId })
    return r.data.session
  },
  getSession: async (sessionId: string) => {
    const r = await apiClient.get<{ session?: unknown }>(`/api/v1/interview-prep/sessions/${sessionId}`)
    return r.data.session
  },
  submitSession: async (sessionId: string, code: string, language: string) => {
    const r = await apiClient.post<{ result?: unknown }>(`/api/v1/interview-prep/sessions/${sessionId}/submit`, { code, language })
    return r.data.result
  },
  answerQuestion: async (sessionId: string, questionId: string, answer: string, selfAssessment: string) => {
    const r = await apiClient.post<{ session?: unknown; review?: unknown }>(`/api/v1/interview-prep/sessions/${sessionId}/questions/${questionId}/answer`, { answer, selfAssessment })
    return r.data
  },
  listCompanies: async (): Promise<string[]> => {
    const r = await apiClient.get<{ companies?: string[] }>('/api/v1/interview-prep/companies')
    return r.data.companies ?? []
  },
  startMockSession: async (companyTag: string) => {
    const r = await apiClient.post<{ session?: unknown }>('/api/v1/interview-prep/mock-sessions', { companyTag })
    return r.data.session
  },
  getMockSession: async (sessionId: string) => {
    const r = await apiClient.get<{ session?: unknown }>(`/api/v1/interview-prep/mock-sessions/${sessionId}`)
    return r.data.session
  },
  submitMockSession: async (sessionId: string, code: string, language: string, notes?: string) => {
    const r = await apiClient.post<{ result?: unknown; review?: unknown; session?: unknown }>(`/api/v1/interview-prep/mock-sessions/${sessionId}/submit`, { code, language, notes })
    return r.data
  },
  answerMockQuestion: async (sessionId: string, answer: string) => {
    const r = await apiClient.post<{ review?: unknown; session?: unknown }>(`/api/v1/interview-prep/mock-sessions/${sessionId}/questions/answer`, { answer })
    return r.data
  },
  submitSystemDesignReview: async (sessionId: string, data: unknown) => {
    const r = await apiClient.post<{ review?: unknown }>(`/api/v1/interview-prep/sessions/${sessionId}/system-design-review`, data)
    return r.data.review
  },
  submitMockSystemDesignReview: async (sessionId: string, data: { notes: string; components: string; apis: string; databaseSchema: string }) => {
    const r = await apiClient.post<{ review?: unknown; session?: unknown }>(`/api/v1/interview-prep/mock-sessions/${sessionId}/system-design-review`, data)
    return r.data
  },
}
