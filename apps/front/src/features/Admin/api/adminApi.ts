import { apiClient } from '@/shared/api/base'

export const adminApi = {
  listCodeTasks: async (params?: { topic?: string; difficulty?: string; includeInactive?: boolean }) => {
    const r = await apiClient.get<{ tasks?: unknown[] }>('/api/v1/code-editor/tasks', {
      params: { topic: params?.topic, difficulty: params?.difficulty, include_inactive: params?.includeInactive ?? true },
    })
    return r.data.tasks ?? []
  },
  createCodeTask: async (payload: unknown) => {
    const r = await apiClient.post<{ task?: unknown }>('/api/admin/code-editor/tasks', payload)
    return r.data.task
  },
  updateCodeTask: async (taskId: string, payload: unknown) => {
    const r = await apiClient.put<{ task?: unknown }>(`/api/admin/code-editor/tasks/${taskId}`, payload)
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
  getConfig: async () => {
    const r = await apiClient.get<unknown>('/api/admin/config')
    return r.data
  },
  updateConfig: async (payload: unknown) => {
    const r = await apiClient.put<unknown>('/api/admin/config', payload)
    return r.data
  },
}
