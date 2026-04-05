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
  id: string; slug?: string; title?: string; statement?: string; prep_type?: string; language?: string
  company_tag?: string; supported_languages?: string[]; is_executable?: boolean; duration_seconds?: number
  starter_code?: string; is_active?: boolean; created_at?: string; updated_at?: string
}

function normalizeTask(t: BackendTask): InterviewPrepTask {
  return {
    id: t.id, slug: t.slug ?? '', title: t.title ?? '', statement: t.statement ?? '',
    prepType: t.prep_type ?? '', language: t.language ?? '', companyTag: t.company_tag ?? '',
    supportedLanguages: t.supported_languages ?? [], isExecutable: t.is_executable ?? false,
    durationSeconds: t.duration_seconds ?? 0, starterCode: t.starter_code ?? '',
    isActive: t.is_active ?? true, createdAt: t.created_at ?? '', updatedAt: t.updated_at ?? '',
  }
}

export const interviewPrepApi = {
  listTasks: async (): Promise<InterviewPrepTask[]> => {
    const r = await apiClient.get<{ tasks?: BackendTask[] }>('/api/v1/interview-prep/tasks')
    return (r.data.tasks ?? []).map(normalizeTask)
  },
  startSession: async (taskId: string) => {
    const r = await apiClient.post<{ session?: unknown }>('/api/v1/interview-prep/sessions', { task_id: taskId })
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
    const r = await apiClient.post<{ session?: unknown; review?: unknown }>(`/api/v1/interview-prep/sessions/${sessionId}/questions/${questionId}/answer`, { answer, self_assessment: selfAssessment })
    return r.data
  },
  listCompanies: async (): Promise<string[]> => {
    const r = await apiClient.get<{ companies?: string[] }>('/api/v1/interview-prep/companies')
    return r.data.companies ?? []
  },
  startMockSession: async (companyTag: string) => {
    const r = await apiClient.post<{ session?: unknown }>('/api/v1/interview-prep/mock-sessions', { company_tag: companyTag })
    return r.data.session
  },
  getMockSession: async (sessionId: string) => {
    const r = await apiClient.get<{ session?: unknown }>(`/api/v1/interview-prep/mock-sessions/${sessionId}`)
    return r.data.session
  },
}
