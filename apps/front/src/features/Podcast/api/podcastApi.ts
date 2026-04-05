import { apiClient } from '@/shared/api/base'
import type { Podcast } from '@/entities/Podcast/model/types'

interface BackendPodcast {
  id: string
  title: string
  authorId: string
  authorName: string
  durationSeconds: number
  listensCount: number
  fileName: string
  contentType: string
  isUploaded: boolean
  createdAt: string
}

function normalize(p: BackendPodcast): Podcast {
  return {
    id: p.id,
    title: p.title,
    authorId: p.authorId,
    authorName: p.authorName,
    durationSeconds: p.durationSeconds,
    listensCount: p.listensCount,
    fileName: p.fileName,
    contentType: p.contentType,
    isUploaded: p.isUploaded,
    createdAt: p.createdAt,
  }
}

export const podcastApi = {
  list: async (params?: { limit?: number; offset?: number }): Promise<{ podcasts: Podcast[]; total: number; hasNextPage: boolean }> => {
    const r = await apiClient.get<{ podcasts?: BackendPodcast[]; totalCount?: number; hasNextPage?: boolean }>('/api/v1/podcasts', { params })
    return {
      podcasts: (r.data.podcasts ?? []).filter(p => p.isUploaded).map(normalize),
      total: r.data.totalCount ?? 0,
      hasNextPage: r.data.hasNextPage ?? false,
    }
  },

  get: async (id: string): Promise<Podcast> => {
    const r = await apiClient.get<{ podcast: BackendPodcast }>(`/api/v1/podcasts/${id}`)
    return normalize(r.data.podcast)
  },

  play: async (id: string): Promise<{ podcast: Podcast; streamUrl: string }> => {
    const r = await apiClient.get<{ podcast: BackendPodcast; streamUrl: string }>(`/api/v1/podcasts/${id}/play`)
    return { podcast: normalize(r.data.podcast), streamUrl: r.data.streamUrl }
  },
}
