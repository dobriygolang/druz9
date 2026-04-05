import { apiClient, withDefaultListQuery, type ListQueryParams } from '@/shared/api/base'
import { createCache } from '@/shared/api/cache'

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
  }
}

export interface CreateEventPayload {
  title: string
  placeLabel?: string
  region?: string
  country?: string
  city?: string
  latitude?: number
  longitude?: number
  scheduledAt: string
  description?: string
  meetingLink?: string
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
      scheduledAt: payload.scheduledAt, description: payload.description, meetingLink: payload.meetingLink,
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
}
