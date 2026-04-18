import { apiClient } from '@/shared/api/base'

export interface DockerLogsResponse {
  service: string
  containerId: string
  logs: string
  tail: number
  since?: string
  availableServices: string[]
}

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
  listInterviewPrepTasks: async (filters?: { companyTag?: string; prepType?: string; search?: string; includeInactive?: boolean }) => {
    const r = await apiClient.get<{ tasks?: unknown[] }>('/api/admin/interview-prep/tasks', {
      params: {
        companyTag: filters?.companyTag ?? '',
        prepType: filters?.prepType ?? '',
        search: filters?.search ?? '',
        includeInactive: filters?.includeInactive ?? true,
      },
    })
    return r.data.tasks ?? []
  },
  bulkCreateInterviewPrepTasks: async (tasks: unknown[]): Promise<{ results: Array<{ slug: string; taskId: string; errorCode: string; errorMsg: string }>; created: number; failed: number }> => {
    const r = await apiClient.post<{ results?: Array<{ slug?: string; taskId?: string; errorCode?: string; errorMsg?: string }>; created?: number; failed?: number }>(
      '/api/admin/interview-prep/tasks/bulk',
      { tasks },
    )
    return {
      results: (r.data.results ?? []).map((x) => ({
        slug: x.slug ?? '',
        taskId: x.taskId ?? '',
        errorCode: x.errorCode ?? '',
        errorMsg: x.errorMsg ?? '',
      })),
      created: r.data.created ?? 0,
      failed: r.data.failed ?? 0,
    }
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

  getDockerLogs: async (params: { service: string; tail?: number; since?: string }) => {
    const r = await apiClient.get<DockerLogsResponse>('/api/admin/docker/logs', {
      params: {
        service: params.service,
        tail: params.tail ?? 300,
        since: params.since || undefined,
      },
      silent: true,
    })
    return r.data
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

  // Shop — Wave E.1. Admin list includes inactive rows; public ListItems
  // hides them.
  listShopItems: async (): Promise<unknown[]> => {
    const r = await apiClient.get<{ items?: unknown[] }>('/api/v1/admin/shop/items', { params: { limit: 200 } })
    return r.data.items ?? []
  },
  createShopItem: async (payload: Record<string, unknown>): Promise<unknown> => {
    const r = await apiClient.post<unknown>('/api/v1/admin/shop/items', payload)
    return r.data
  },
  updateShopItem: async (id: string, payload: Record<string, unknown>): Promise<unknown> => {
    const r = await apiClient.put<unknown>(`/api/v1/admin/shop/items/${id}`, { ...payload, id })
    return r.data
  },
  deleteShopItem: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/admin/shop/items/${id}`)
  },

  // Season Pass admin — Wave E.2.
  listSeasonPasses: async (): Promise<unknown[]> => {
    const r = await apiClient.get<{ passes?: unknown[] }>('/api/v1/admin/season-pass')
    return r.data.passes ?? []
  },
  createSeasonPass: async (payload: Record<string, unknown>): Promise<unknown> => {
    const r = await apiClient.post<unknown>('/api/v1/admin/season-pass', payload)
    return r.data
  },
  updateSeasonPass: async (id: string, payload: Record<string, unknown>): Promise<unknown> => {
    const r = await apiClient.put<unknown>(`/api/v1/admin/season-pass/${id}`, { ...payload, id })
    return r.data
  },
  deleteSeasonPass: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/admin/season-pass/${id}`)
  },
  upsertSeasonPassTier: async (seasonPassId: string, tier: number, payload: Record<string, unknown>): Promise<unknown> => {
    const r = await apiClient.put<unknown>(`/api/v1/admin/season-pass/${seasonPassId}/tiers/${tier}`, { ...payload, seasonPassId, tier })
    return r.data
  },
  deleteSeasonPassTier: async (seasonPassId: string, tier: number): Promise<void> => {
    await apiClient.delete(`/api/v1/admin/season-pass/${seasonPassId}/tiers/${tier}`)
  },

  // Notifications broadcast — Wave E.4.
  broadcastNotification: async (
    title: string, body: string, deepLink: string, targetUserIds: string[]
  ): Promise<{ delivered: number }> => {
    const r = await apiClient.post<{ delivered?: number }>('/api/v1/admin/notifications/broadcast', {
      title, body, deepLink, targetUserIds,
    })
    return { delivered: r.data.delivered ?? 0 }
  },

  // Podcasts admin — uses existing public ListPodcasts + admin CreatePodcast/DeletePodcast.
  listAllPodcasts: async (): Promise<unknown[]> => {
    const r = await apiClient.get<{ podcasts?: unknown[] }>('/api/v1/podcasts', { params: { limit: 200 } })
    return r.data.podcasts ?? []
  },
  deletePodcast: async (podcastId: string): Promise<void> => {
    await apiClient.delete(`/api/admin/podcasts/${podcastId}`)
  },
}
