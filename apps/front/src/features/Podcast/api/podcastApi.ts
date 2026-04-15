import { apiClient } from '@/shared/api/base'
import type { Podcast } from '@/entities/Podcast/model/types'

export const podcastApi = {
  list: async (params?: { limit?: number; offset?: number }): Promise<{ podcasts: Podcast[]; total: number; hasNextPage: boolean }> => {
    const r = await apiClient.get<{ podcasts?: Podcast[]; totalCount?: number; hasNextPage?: boolean }>('/api/v1/podcasts', { params })
    return {
      podcasts: (r.data.podcasts ?? []).filter(p => p.isUploaded),
      total: r.data.totalCount ?? 0,
      hasNextPage: r.data.hasNextPage ?? false,
    }
  },

  get: async (id: string): Promise<Podcast> => {
    const r = await apiClient.get<{ podcast: Podcast }>(`/api/v1/podcasts/${id}`)
    return r.data.podcast
  },

  play: async (id: string): Promise<{ podcast: Podcast; streamUrl: string }> => {
    const r = await apiClient.get<{ podcast: Podcast; streamUrl: string }>(`/api/v1/podcasts/${id}/play`)
    return { podcast: r.data.podcast, streamUrl: r.data.streamUrl }
  },
}
