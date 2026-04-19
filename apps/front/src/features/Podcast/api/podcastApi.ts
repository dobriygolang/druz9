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

  // ── Admin / creator upload flow ────────────────────────────────────
  // 3-step contract mirroring the backend: create shell → ask for a
  // presigned URL → client uploads bytes directly → mark complete.

  create: async (title: string): Promise<Podcast> => {
    const r = await apiClient.post<{ podcast: Podcast }>('/api/admin/podcasts', { title })
    return r.data.podcast
  },

  prepareUpload: async (payload: {
    podcastId: string
    fileName: string
    contentType: string
    durationSeconds: number
  }): Promise<{ uploadUrl: string; objectKey: string; podcast: Podcast }> => {
    const r = await apiClient.post<{ uploadUrl: string; objectKey: string; podcast: Podcast }>(
      `/api/admin/podcasts/${payload.podcastId}/upload/prepare`,
      {
        fileName: payload.fileName,
        contentType: payload.contentType,
        durationSeconds: payload.durationSeconds,
      },
    )
    return r.data
  },

  completeUpload: async (payload: {
    podcastId: string
    fileName: string
    contentType: string
    durationSeconds: number
    objectKey: string
  }): Promise<Podcast> => {
    const r = await apiClient.post<{ podcast: Podcast }>(
      `/api/admin/podcasts/${payload.podcastId}/upload/complete`,
      {
        fileName: payload.fileName,
        contentType: payload.contentType,
        durationSeconds: payload.durationSeconds,
        objectKey: payload.objectKey,
      },
    )
    return r.data.podcast
  },

  // ADR-005 — Saved podcasts (cross-device list). The legacy localStorage
  // path is kept as a hydration source on first load (see PodcastsPage)
  // until users have migrated their lists.
  listSaved: async (params?: { limit?: number; offset?: number }): Promise<{ podcasts: Podcast[]; total: number }> => {
    const r = await apiClient.get<{ podcasts?: Podcast[]; totalCount?: number }>('/api/v1/podcasts/saved', {
      params,
      silent: true,
    } as never)
    return {
      podcasts: (r.data.podcasts ?? []).filter(p => p.isUploaded),
      total: r.data.totalCount ?? 0,
    }
  },
  save: async (id: string): Promise<void> => {
    await apiClient.post(`/api/v1/podcasts/${id}/save`, {}, { silent: true } as never)
  },
  unsave: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/podcasts/${id}/save`, { silent: true } as never)
  },
}
