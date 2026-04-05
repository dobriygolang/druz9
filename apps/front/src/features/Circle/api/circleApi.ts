import { apiClient } from '@/shared/api/base'
import { createCache } from '@/shared/api/cache'
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

const listCirclesCache = createCache<string, Circle[]>()

export const circleApi = {
  listCircles: async (): Promise<Circle[]> => {
    const key = 'all'
    const inFlight = listCirclesCache.getInFlight(key)
    if (inFlight) return inFlight
    const req = apiClient.get<{ circles?: BackendCircle[] }>('/api/v1/circles')
      .then(r => (r.data.circles ?? []).map(normalizeCircle))
      .finally(() => listCirclesCache.deleteInFlight(key))
    listCirclesCache.setInFlight(key, req)
    return req
  },
  joinCircle: async (circleId: string): Promise<Circle> => {
    const r = await apiClient.post<{ circle: BackendCircle }>(`/api/v1/circles/${circleId}/join`, {})
    return normalizeCircle(r.data.circle)
  },
  leaveCircle: async (circleId: string): Promise<void> => {
    await apiClient.post(`/api/v1/circles/${circleId}/leave`, {})
  },
}
