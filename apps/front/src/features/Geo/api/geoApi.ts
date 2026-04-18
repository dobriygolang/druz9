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
  displayName?: string
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
    const r = await apiClient.post<{ candidates?: BackendGeoSuggestion[] }>('/api/v1/geo/resolve', { query })
    return (r.data.candidates ?? []).map((s) => ({
      placeLabel: s.displayName ?? s.city ?? '', city: s.city, region: s.region, country: s.country,
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

  // World map pins — guild halls + upcoming events aggregated server-side.
  listWorldPins: async (): Promise<WorldPin[]> => {
    const { data } = await apiClient.get<{ pins?: WorldPinRaw[] }>('/api/v1/geo/world-pins')
    return (data.pins ?? []).map((p) => ({
      id: p.id ?? '',
      kind: (p.kind ?? 0) as WorldPinKind,
      title: p.title ?? '',
      subtitle: p.subtitle ?? '',
      latitude: p.latitude ?? 0,
      longitude: p.longitude ?? 0,
      region: p.region ?? '',
      iconRef: p.iconRef ?? '',
      linkPath: p.linkPath ?? '',
      isHot: p.isHot ?? false,
    }))
  },
}

// ---------- World pin types ----------
export enum WorldPinKind {
  UNSPECIFIED = 0,
  GUILD = 1,
  EVENT = 2,
  PLAYER = 3,
}

export interface WorldPin {
  id: string
  kind: WorldPinKind
  title: string
  subtitle: string
  latitude: number
  longitude: number
  region: string
  iconRef: string
  linkPath: string
  isHot: boolean
}

interface WorldPinRaw {
  id?: string
  kind?: number
  title?: string
  subtitle?: string
  latitude?: number
  longitude?: number
  region?: string
  iconRef?: string
  linkPath?: string
  isHot?: boolean
}
