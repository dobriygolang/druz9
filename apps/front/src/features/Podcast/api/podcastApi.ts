import { apiClient } from '@/shared/api/base'
import type { Podcast } from '@/entities/Podcast/model/types'

interface BackendPodcast {
  id: string
  title: string
  author_id: string
  author_name: string
  duration_seconds: number
  listens_count: number
  file_name: string
  content_type: string
  is_uploaded: boolean
  created_at: string
}

function normalize(p: BackendPodcast): Podcast {
  return {
    id: p.id,
    title: p.title,
    authorId: p.author_id,
    authorName: p.author_name,
    durationSeconds: p.duration_seconds,
    listensCount: p.listens_count,
    fileName: p.file_name,
    contentType: p.content_type,
    isUploaded: p.is_uploaded,
    createdAt: p.created_at,
  }
}

export const podcastApi = {
  list: async (params?: { limit?: number; offset?: number }): Promise<{ podcasts: Podcast[]; total: number; hasNextPage: boolean }> => {
    const r = await apiClient.get<{ podcasts?: BackendPodcast[]; total_count?: number; has_next_page?: boolean }>('/api/v1/podcasts', { params })
    return {
      podcasts: (r.data.podcasts ?? []).filter(p => p.is_uploaded).map(normalize),
      total: r.data.total_count ?? 0,
      hasNextPage: r.data.has_next_page ?? false,
    }
  },

  get: async (id: string): Promise<Podcast> => {
    const r = await apiClient.get<{ podcast: BackendPodcast }>(`/api/v1/podcasts/${id}`)
    return normalize(r.data.podcast)
  },

  play: async (id: string): Promise<{ podcast: Podcast; streamUrl: string }> => {
    const r = await apiClient.get<{ podcast: BackendPodcast; stream_url: string }>(`/api/v1/podcasts/${id}/play`)
    return { podcast: normalize(r.data.podcast), streamUrl: r.data.stream_url }
  },
}
