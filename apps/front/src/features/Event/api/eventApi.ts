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
  place_label?: string
  region?: string
  country?: string
  city?: string
  latitude?: number
  longitude?: number
  scheduled_at?: string
  created_at?: string
  creator_id?: string
  creator_name?: string
  is_creator?: boolean
  is_joined?: boolean
  participant_count?: number
  description?: string
  meeting_link?: string
}

function normalizeEvent(e: BackendEvent): Event {
  return {
    id: e.id, title: e.title,
    placeLabel: e.place_label ?? '', region: e.region ?? '', country: e.country ?? '', city: e.city ?? '',
    latitude: e.latitude ?? 0, longitude: e.longitude ?? 0,
    scheduledAt: e.scheduled_at ?? '', createdAt: e.created_at ?? '',
    creatorId: e.creator_id ?? '', creatorName: e.creator_name ?? '',
    isCreator: e.is_creator ?? false, isJoined: e.is_joined ?? false,
    participantCount: e.participant_count ?? 0,
    description: e.description ?? '', meetingLink: e.meeting_link ?? '',
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
    const req = apiClient.get<{ events?: BackendEvent[]; total_count?: number }>('/api/v1/events', {
      params: { ...withDefaultListQuery(params), status: params?.status, creator_id: params?.creatorId },
    }).then(r => {
      const result = { events: (r.data.events ?? []).map(normalizeEvent), total: r.data.total_count ?? 0 }
      return result
    }).finally(() => listEventsCache.deleteInFlight(key))
    listEventsCache.setInFlight(key, req)
    return req
  },
  createEvent: async (payload: CreateEventPayload): Promise<Event> => {
    const r = await apiClient.post<{ event: BackendEvent }>('/api/v1/events', {
      title: payload.title, place_label: payload.placeLabel, region: payload.region,
      country: payload.country, city: payload.city, latitude: payload.latitude, longitude: payload.longitude,
      scheduled_at: payload.scheduledAt, description: payload.description, meeting_link: payload.meetingLink,
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
