import { apiClient } from '@/shared/api/base'
import type { Circle, CirclePulse, CircleChallenge, CircleMemberStats } from '@/entities/Circle/model/types'

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
  isPublic?: boolean
}

export interface CircleMember {
  userId: string
  firstName: string
  lastName: string
  avatarUrl: string
  role: string
  joinedAt: string
}

export const circleApi = {
  getCircle: async (circleId: string): Promise<Circle> => {
    // Backend has no GET /api/v1/circles/{id} — fetch list and find by id
    const r = await apiClient.get<{ circles?: BackendCircle[] }>('/api/v1/circles', {
      params: { limit: 200, offset: 0 },
    })
    const found = (r.data.circles ?? []).find(c => c.id === circleId)
    if (!found) throw new Error('Circle not found')
    return normalizeCircle(found)
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
      isPublic: payload.isPublic ?? true,
    })
    return normalizeCircle(r.data.circle)
  },

  inviteMember: async (circleId: string, userId: string): Promise<void> => {
    await apiClient.post(`/api/v1/circles/${circleId}/invite`, { userId })
  },

  joinCircle: async (circleId: string): Promise<void> => {
    await apiClient.post(`/api/v1/circles/${circleId}/join`, {})
  },

  leaveCircle: async (circleId: string): Promise<void> => {
    await apiClient.post(`/api/v1/circles/${circleId}/leave`, {})
  },
  listMembers: async (circleId: string): Promise<CircleMember[]> => {
    const r = await apiClient.get<{ members?: CircleMember[] }>(`/api/v1/circles/${circleId}/members`)
    return r.data.members ?? []
  },

  deleteCircle: async (circleId: string): Promise<void> => {
    await apiClient.delete(`/api/v1/circles/${circleId}`)
  },

  getCirclePulse: async (circleId: string): Promise<CirclePulse> => {
    const r = await apiClient.get<{
      activeToday?: number
      totalMembers?: number
      weekActivity?: CirclePulse['weekActivity']
      recentActions?: CirclePulse['recentActions']
    }>(`/api/v1/circles/${circleId}/pulse`)
    return {
      activeToday: r.data.activeToday ?? 0,
      totalMembers: r.data.totalMembers ?? 0,
      weekActivity: r.data.weekActivity ?? [],
      recentActions: r.data.recentActions ?? [],
    }
  },

  getCircleMemberStats: async (circleId: string): Promise<CircleMemberStats[]> => {
    const r = await apiClient.get<{ members?: CircleMemberStats[] }>(`/api/v1/circles/${circleId}/member-stats`)
    return r.data.members ?? []
  },

  getActiveChallenge: async (circleId: string): Promise<CircleChallenge | null> => {
    try {
      const r = await apiClient.get<{ challenge?: CircleChallenge }>(`/api/v1/circles/${circleId}/challenge`)
      return r.data.challenge ?? null
    } catch {
      return null
    }
  },

  createChallenge: async (circleId: string, templateKey: string, targetValue: number): Promise<CircleChallenge> => {
    const r = await apiClient.post<{ challenge: CircleChallenge }>(`/api/v1/circles/${circleId}/challenge`, {
      templateKey,
      targetValue,
    })
    return r.data.challenge
  },
}
