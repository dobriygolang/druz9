import { apiClient } from '@/shared/api/base'

export interface GeoSuggestion {
  placeLabel: string
  city?: string
  region?: string
  country?: string
  latitude: number
  longitude: number
}

type BackendGeoSuggestion = {
  placeLabel?: string
  city?: string
  region?: string
  country?: string
  latitude?: number
  longitude?: number
}

export interface CommunityPoint {
  userId: string
  title: string
  region: string
  latitude: number
  longitude: number
  isCurrentUser: boolean
  avatarUrl: string | null
  username: string
  firstName: string
  lastName: string
  activityStatus: 'online' | 'recently_active' | 'offline'
  telegramUsername: string
}

type BackendCommunityPoint = {
  userId?: string
  title?: string
  region?: string
  latitude?: number
  longitude?: number
  isCurrentUser?: boolean
  avatarUrl?: string | null
  username?: string
  firstName?: string
  lastName?: string
  activityStatus?: string
  telegramUsername?: string
}

const ACTIVITY_STATUS_MAP: Record<string, CommunityPoint['activityStatus']> = {
  USER_ACTIVITY_STATUS_ONLINE: 'online',
  USER_ACTIVITY_STATUS_RECENTLY_ACTIVE: 'recently_active',
  USER_ACTIVITY_STATUS_OFFLINE: 'offline',
  online: 'online',
  recently_active: 'recently_active',
  offline: 'offline',
}

function normalizeActivityStatus(s?: string): CommunityPoint['activityStatus'] {
  return ACTIVITY_STATUS_MAP[s ?? ''] ?? 'offline'
}

export const geoApi = {
  suggest: async (query: string): Promise<GeoSuggestion[]> => {
    const r = await apiClient.post<{ suggestions?: BackendGeoSuggestion[] }>('/api/v1/geo/resolve', { query })
    return (r.data.suggestions ?? []).map((s) => ({
      placeLabel: s.placeLabel ?? '', city: s.city, region: s.region, country: s.country,
      latitude: s.latitude ?? 0, longitude: s.longitude ?? 0,
    }))
  },

  getCommunity: async (): Promise<CommunityPoint[]> => {
    const r = await apiClient.get<{ points?: BackendCommunityPoint[] }>('/api/v1/geo/community')
    return (r.data.points ?? []).map((p) => ({
      userId: p.userId ?? '',
      title: p.title ?? '',
      region: p.region ?? '',
      latitude: p.latitude ?? 0,
      longitude: p.longitude ?? 0,
      isCurrentUser: p.isCurrentUser ?? false,
      avatarUrl: p.avatarUrl ?? null,
      username: p.username ?? '',
      firstName: p.firstName ?? '',
      lastName: p.lastName ?? '',
      activityStatus: normalizeActivityStatus(p.activityStatus),
      telegramUsername: p.telegramUsername ?? '',
    }))
  },
}
