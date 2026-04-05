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
  place_label?: string
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
  activityStatus: string
}

type BackendCommunityPoint = {
  user_id?: string
  title?: string
  region?: string
  latitude?: number
  longitude?: number
  is_current_user?: boolean
  avatar_url?: string | null
  username?: string
  first_name?: string
  last_name?: string
  activity_status?: string
}

export const geoApi = {
  suggest: async (query: string): Promise<GeoSuggestion[]> => {
    const r = await apiClient.post<{ suggestions?: BackendGeoSuggestion[] }>('/api/v1/geo/resolve', { query })
    return (r.data.suggestions ?? []).map((s) => ({
      placeLabel: s.place_label ?? '', city: s.city, region: s.region, country: s.country,
      latitude: s.latitude ?? 0, longitude: s.longitude ?? 0,
    }))
  },

  getCommunity: async (): Promise<CommunityPoint[]> => {
    const r = await apiClient.get<{ points?: BackendCommunityPoint[] }>('/api/v1/geo/community')
    return (r.data.points ?? []).map((p) => ({
      userId: p.user_id ?? '',
      title: p.title ?? '',
      region: p.region ?? '',
      latitude: p.latitude ?? 0,
      longitude: p.longitude ?? 0,
      isCurrentUser: p.is_current_user ?? false,
      avatarUrl: p.avatar_url ?? null,
      username: p.username ?? '',
      firstName: p.first_name ?? '',
      lastName: p.last_name ?? '',
      activityStatus: p.activity_status ?? 'offline',
    }))
  },
}
