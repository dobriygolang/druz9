import { apiClient } from '@/shared/api/base'

export const adminApi = {
  listCodeTasks: async (params?: { topic?: string; difficulty?: string; includeInactive?: boolean }) => {
    const r = await apiClient.get<{ tasks?: unknown[] }>('/api/v1/code-editor/tasks', {
      params: { topic: params?.topic, difficulty: params?.difficulty, includeInactive: params?.includeInactive ?? true },
    })
    return r.data.tasks ?? []
  },
  createCodeTask: async (payload: unknown) => {
    const r = await apiClient.post<{ task?: unknown }>('/api/admin/code-editor/tasks', { task: payload })
    return r.data.task
  },
  updateCodeTask: async (taskId: string, payload: unknown) => {
    const r = await apiClient.put<{ task?: unknown }>(`/api/admin/code-editor/tasks/${taskId}`, { task: payload })
    return r.data.task
  },
  deleteCodeTask: async (taskId: string) => {
    await apiClient.delete(`/api/admin/code-editor/tasks/${taskId}`)
  },
  listInterviewPrepTasks: async () => {
    const r = await apiClient.get<{ tasks?: unknown[] }>('/api/admin/interview-prep/tasks')
    return r.data.tasks ?? []
  },
  createInterviewPrepTask: async (payload: unknown) => {
    const r = await apiClient.post<{ task?: unknown }>('/api/admin/interview-prep/tasks', payload)
    return r.data.task
  },
  updateInterviewPrepTask: async (taskId: string, payload: unknown) => {
    const r = await apiClient.put<{ task?: unknown }>(`/api/admin/interview-prep/tasks/${taskId}`, payload)
    return r.data.task
  },
  deleteInterviewPrepTask: async (taskId: string) => {
    await apiClient.delete(`/api/admin/interview-prep/tasks/${taskId}`)
  },

  // Config
  getConfig: async () => {
    const r = await apiClient.get<unknown>('/api/admin/config')
    return r.data
  },
  updateConfig: async (key: string, value: unknown) => {
    const r = await apiClient.put<unknown>(`/api/admin/config/${key}`, { value })
    return r.data
  },

  // Mock question pools
  listMockQuestionPools: async () => {
    const r = await apiClient.get<{ pools?: unknown[] }>('/api/admin/interview-prep/mock-question-pools')
    return r.data.pools ?? []
  },
  createMockQuestionPool: async (data: unknown) => {
    const r = await apiClient.post<{ pool?: unknown }>('/api/admin/interview-prep/mock-question-pools', data)
    return r.data.pool
  },
  updateMockQuestionPool: async (id: string, data: unknown) => {
    const r = await apiClient.put<{ pool?: unknown }>(`/api/admin/interview-prep/mock-question-pools/${id}`, data)
    return r.data.pool
  },
  deleteMockQuestionPool: async (id: string) => {
    await apiClient.delete(`/api/admin/interview-prep/mock-question-pools/${id}`)
  },

  // Company presets
  listCompanyPresets: async () => {
    const r = await apiClient.get<{ presets?: unknown[] }>('/api/admin/interview-prep/mock-company-presets')
    return r.data.presets ?? []
  },
  createCompanyPreset: async (data: unknown) => {
    const r = await apiClient.post<{ preset?: unknown }>('/api/admin/interview-prep/mock-company-presets', data)
    return r.data.preset
  },
  updateCompanyPreset: async (id: string, data: unknown) => {
    const r = await apiClient.put<{ preset?: unknown }>(`/api/admin/interview-prep/mock-company-presets/${id}`, data)
    return r.data.preset
  },
  deleteCompanyPreset: async (id: string) => {
    await apiClient.delete(`/api/admin/interview-prep/mock-company-presets/${id}`)
  },
}
