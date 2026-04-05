import { apiClient } from '@/shared/api/base'
import type { Circle } from '@/entities/Circle/model/types'

type BackendCircle = {
  id: string
  name: string
  description?: string
  member_count?: number
  tags?: string[]
  is_joined?: boolean
  creator_id?: string
  created_at?: string
}

function normalizeCircle(c: BackendCircle): Circle {
  return {
    id: c.id, name: c.name, description: c.description ?? '',
    memberCount: c.member_count ?? 0, tags: c.tags ?? [],
    isJoined: c.is_joined ?? false, creatorId: c.creator_id ?? '', createdAt: c.created_at ?? '',
  }
}

export const circleApi = {
  listCircles: async (): Promise<Circle[]> => {
    const r = await apiClient.get<{ circles?: BackendCircle[] }>('/api/v1/circles')
    return (r.data.circles ?? []).map(normalizeCircle)
  },
  joinCircle: async (circleId: string): Promise<Circle> => {
    const r = await apiClient.post<{ circle: BackendCircle }>(`/api/v1/circles/${circleId}/join`, {})
    return normalizeCircle(r.data.circle)
  },
  leaveCircle: async (circleId: string): Promise<void> => {
    await apiClient.post(`/api/v1/circles/${circleId}/leave`, {})
  },
}
