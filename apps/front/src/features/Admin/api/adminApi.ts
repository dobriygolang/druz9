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
    const r = await apiClient.post<{ task?: unknown }>('/api/admin/interview-prep/tasks', { task: payload })
    return r.data.task
  },
  updateInterviewPrepTask: async (taskId: string, payload: unknown) => {
    const r = await apiClient.put<{ task?: unknown }>(`/api/admin/interview-prep/tasks/${taskId}`, { task: payload })
    return r.data.task
  },
  deleteInterviewPrepTask: async (taskId: string) => {
    await apiClient.delete(`/api/admin/interview-prep/tasks/${taskId}`)
  },

  // Config
  getConfig: async () => {
    const r = await apiClient.get<{ configs?: Array<{ key: string; value: string; type: string }> }>('/api/admin/config')
    const map: Record<string, string | boolean> = {}
    for (const item of r.data.configs ?? []) {
      map[item.key] = item.type === 'bool' ? item.value === 'true' : item.value
    }
    return map
  },
  updateConfig: async (key: string, value: unknown) => {
    await apiClient.put(`/api/admin/config/${key}`, { value: String(value) })
  },

  // Mock question pools
  listMockQuestionPools: async () => {
    const r = await apiClient.get<{ items?: unknown[] }>('/api/admin/interview-prep/mock-question-pools')
    return r.data.items ?? []
  },
  createMockQuestionPool: async (data: unknown) => {
    const r = await apiClient.post<{ item?: unknown }>('/api/admin/interview-prep/mock-question-pools', { item: data })
    return r.data.item
  },
  updateMockQuestionPool: async (id: string, data: unknown) => {
    const r = await apiClient.put<{ item?: unknown }>(`/api/admin/interview-prep/mock-question-pools/${id}`, { item: data })
    return r.data.item
  },
  deleteMockQuestionPool: async (id: string) => {
    await apiClient.delete(`/api/admin/interview-prep/mock-question-pools/${id}`)
  },

  // Company presets
  listCompanyPresets: async () => {
    const r = await apiClient.get<{ items?: unknown[] }>('/api/admin/interview-prep/mock-company-presets')
    return r.data.items ?? []
  },
  createCompanyPreset: async (data: unknown) => {
    const r = await apiClient.post<{ item?: unknown }>('/api/admin/interview-prep/mock-company-presets', { item: data })
    return r.data.item
  },
  updateCompanyPreset: async (id: string, data: unknown) => {
    const r = await apiClient.put<{ item?: unknown }>(`/api/admin/interview-prep/mock-company-presets/${id}`, { item: data })
    return r.data.item
  },
  deleteCompanyPreset: async (id: string) => {
    await apiClient.delete(`/api/admin/interview-prep/mock-company-presets/${id}`)
  },
}
