import { apiClient } from '@/shared/api/base'
import type { Circle } from '@/entities/Circle/model/types'

type BackendCircle = {
  id: string
  name: string
  description?: string
  creator_id?: string
  member_count?: number
  tags?: string[]
  is_public?: boolean
  is_joined?: boolean
  created_at?: string
}

function normalizeCircle(c: BackendCircle): Circle {
  return {
    id: c.id,
    name: c.name,
    description: c.description ?? '',
    creatorId: c.creator_id ?? '',
    memberCount: c.member_count ?? 0,
    tags: c.tags ?? [],
    isPublic: c.is_public ?? true,
    isJoined: c.is_joined ?? false,
    createdAt: c.created_at ?? '',
  }
}

export interface CreateCirclePayload {
  name: string
  description?: string
  tags?: string[]
}

export const circleApi = {
  listCircles: async (params?: { limit?: number; offset?: number }): Promise<{ circles: Circle[]; totalCount: number }> => {
    const r = await apiClient.get<{ circles?: BackendCircle[]; total_count?: number }>('/api/v1/circles', {
      params: { limit: params?.limit ?? 20, offset: params?.offset ?? 0 },
    })
    return {
      circles: (r.data.circles ?? []).map(normalizeCircle),
      totalCount: r.data.total_count ?? 0,
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
