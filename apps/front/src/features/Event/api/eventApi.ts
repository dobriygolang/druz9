import { apiClient, withDefaultListQuery, type ListQueryParams } from '@/shared/api/base'
import { createCache } from '@/shared/api/cache'
import { toMoscowApiDateTime } from '@/shared/lib/moscowTime'

export interface Event {
  id: string
  title: string
  placeLabel: string
  region: string
  country: string
  city: string
  latitude: number
  longitude: number
  scheduledAt: string
  createdAt: string
  creatorId: string
  creatorName: string
  isCreator: boolean
  isJoined: boolean
  participantCount: number
  description: string
  meetingLink: string
  repeat: string
  guildId?: string
  status: string
}

type BackendEvent = {
  id: string
  title: string
  placeLabel?: string
  region?: string
  country?: string
  city?: string
  latitude?: number
  longitude?: number
  scheduledAt?: string
  createdAt?: string
  creatorId?: string
  creatorName?: string
  isCreator?: boolean
  isJoined?: boolean
  participantCount?: number
  description?: string
  meetingLink?: string
  repeat?: string
  guildId?: string
  status?: string
}

// Backend switched Event.status from a bare string to the EventStatus
// proto enum. grpc-gateway emits either the canonical name
// ("EVENT_STATUS_APPROVED") or a number. Normalise back to the legacy
// lowercase values so the rest of the frontend keeps working unchanged.
function normalizeEventStatus(raw: unknown): 'pending' | 'approved' | 'rejected' {
  const s = typeof raw === 'string' ? raw.toUpperCase() : ''
  if (s === 'EVENT_STATUS_PENDING' || s === 'PENDING' || raw === 1) return 'pending'
  if (s === 'EVENT_STATUS_REJECTED' || s === 'REJECTED' || raw === 3) return 'rejected'
  // default = approved (covers both new 'EVENT_STATUS_APPROVED' and legacy 'approved')
  return 'approved'
}

function normalizeEvent(e: BackendEvent): Event {
  return {
    id: e.id, title: e.title,
    placeLabel: e.placeLabel ?? '', region: e.region ?? '', country: e.country ?? '', city: e.city ?? '',
    latitude: e.latitude ?? 0, longitude: e.longitude ?? 0,
    scheduledAt: e.scheduledAt ?? '', createdAt: e.createdAt ?? '',
    creatorId: e.creatorId ?? '', creatorName: e.creatorName ?? '',
    isCreator: e.isCreator ?? false, isJoined: e.isJoined ?? false,
    participantCount: e.participantCount ?? 0,
    description: e.description ?? '', meetingLink: e.meetingLink ?? '',
    repeat: e.repeat ?? 'none',
    guildId: e.guildId,
    status: normalizeEventStatus(e.status),
  }
}

export type EventRepeat = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'

export const REPEAT_LABELS: Record<EventRepeat, string> = {
  none: 'Не повторять',
  daily: 'Каждый день (14 дней)',
  weekly: 'Каждую неделю (8 недель)',
  monthly: 'Каждый месяц (6 месяцев)',
  yearly: 'Каждый год (2 года)',
}

export interface CreateEventPayload {
  title: string
  placeLabel?: string
  region?: string
  country?: string
  city?: string
  latitude?: number
  longitude?: number
  scheduledAt?: string
  description?: string
  meetingLink?: string
  repeat?: EventRepeat
}

const listEventsCache = createCache<string, { events: Event[]; total: number }>()

export const eventApi = {
  listEvents: async (params?: ListQueryParams & { status?: string; creatorId?: string }): Promise<{ events: Event[]; total: number }> => {
    const key = JSON.stringify(params ?? {})
    const inFlight = listEventsCache.getInFlight(key)
    if (inFlight) return inFlight
    const req = apiClient.get<{ events?: BackendEvent[]; totalCount?: number }>('/api/v1/events', {
      params: { ...withDefaultListQuery(params), status: params?.status, creatorId: params?.creatorId },
    }).then(r => {
      const result = { events: (r.data.events ?? []).map(normalizeEvent), total: r.data.totalCount ?? 0 }
      return result
    }).finally(() => listEventsCache.deleteInFlight(key))
    listEventsCache.setInFlight(key, req)
    return req
  },
  createEvent: async (payload: CreateEventPayload): Promise<Event> => {
    const r = await apiClient.post<{ event: BackendEvent }>('/api/v1/events', {
      title: payload.title, placeLabel: payload.placeLabel, region: payload.region,
      country: payload.country, city: payload.city, latitude: payload.latitude, longitude: payload.longitude,
      scheduledAt: toMoscowApiDateTime(payload.scheduledAt), description: payload.description, meetingLink: payload.meetingLink,
      repeat: payload.repeat ?? 'none',
    })
    return normalizeEvent(r.data.event)
  },
  joinEvent: async (eventId: string): Promise<Event> => {
    const r = await apiClient.post<{ event: BackendEvent }>(`/api/v1/events/${eventId}/join`, {})
    return normalizeEvent(r.data.event)
  },
  leaveEvent: async (eventId: string): Promise<void> => {
    await apiClient.post(`/api/v1/events/${eventId}/leave`, {})
  },
  deleteEvent: async (eventId: string): Promise<void> => {
    await apiClient.delete(`/api/v1/events/${eventId}`)
  },
  inviteToEvent: async (eventId: string, userId: string): Promise<void> => {
    await apiClient.post(`/api/v1/events/${eventId}/invite`, { userId })
  },
  listGuildEvents: async (guildId: string, status?: 'upcoming' | 'past'): Promise<Event[]> => {
    // Backend expects the EventListFilter proto enum; send the canonical
    // uppercase name so grpc-gateway parses it without guessing.
    const proto = status === 'past'
      ? 'EVENT_LIST_FILTER_PAST'
      : status === 'upcoming'
        ? 'EVENT_LIST_FILTER_UPCOMING'
        : undefined
    const r = await apiClient.get<{ events?: BackendEvent[] }>(`/api/v1/guilds/${guildId}/events`, {
      params: proto ? { status: proto } : undefined,
    })
    return (r.data.events ?? []).map(normalizeEvent)
  },
  createGuildEvent: async (guildId: string, payload: CreateEventPayload): Promise<Event> => {
    const r = await apiClient.post<{ event: BackendEvent }>(`/api/v1/guilds/${guildId}/events`, {
      title: payload.title,
      description: payload.description,
      meetingLink: payload.meetingLink,
      placeLabel: payload.placeLabel,
      scheduledAt: toMoscowApiDateTime(payload.scheduledAt),
      repeat: payload.repeat ?? 'none',
    })
    return normalizeEvent(r.data.event)
  },
}
