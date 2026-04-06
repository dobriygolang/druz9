import { apiClient } from '@/shared/api/base'
import type { Circle } from '@/entities/Circle/model/types'

type BackendCircle = {
  id: string
  name: string
  description?: string
  creatorId?: string
  memberCount?: number
  tags?: string[]
  isPublic?: boolean
  isJoined?: boolean
  createdAt?: string
}

function normalizeCircle(c: BackendCircle): Circle {
  return {
    id: c.id,
    name: c.name,
    description: c.description ?? '',
    creatorId: c.creatorId ?? '',
    memberCount: c.memberCount ?? 0,
    tags: c.tags ?? [],
    isPublic: c.isPublic ?? true,
    isJoined: c.isJoined ?? false,
    createdAt: c.createdAt ?? '',
  }
}

export interface CreateCirclePayload {
  name: string
  description?: string
  tags?: string[]
}

export const circleApi = {
  getCircle: async (circleId: string): Promise<Circle> => {
    const r = await apiClient.get<{ circle: BackendCircle }>(`/api/v1/circles/${circleId}`)
    return normalizeCircle(r.data.circle)
  },

  listCircles: async (params?: { limit?: number; offset?: number }): Promise<{ circles: Circle[]; totalCount: number }> => {
    const r = await apiClient.get<{ circles?: BackendCircle[]; totalCount?: number }>('/api/v1/circles', {
      params: { limit: params?.limit ?? 20, offset: params?.offset ?? 0 },
    })
    return {
      circles: (r.data.circles ?? []).map(normalizeCircle),
      totalCount: r.data.totalCount ?? 0,
    }
  },

  createCircle: async (payload: CreateCirclePayload): Promise<Circle> => {
    const r = await apiClient.post<{ circle: BackendCircle }>('/api/v1/circles', {
      name: payload.name,
      description: payload.description ?? '',
      tags: payload.tags ?? [],
    })
    return normalizeCircle(r.data.circle)
  },

  joinCircle: async (circleId: string): Promise<void> => {
    await apiClient.post(`/api/v1/circles/${circleId}/join`, {})
  },

  leaveCircle: async (circleId: string): Promise<void> => {
    await apiClient.post(`/api/v1/circles/${circleId}/leave`, {})
  },
}
