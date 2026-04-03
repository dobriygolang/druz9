import {
  CommunityEvent,
  CreateEventPayload,
  EventParticipant,
} from '@/entities/User/model/types';
import { apiClient, ListQueryParams, withDefaultListQuery } from '@/shared/api/base';
import { encodeEventDescription, parseEventDescription } from '@/features/Event/lib/eventMetadata';

const defaultEventsCache = {
  data: null as CommunityEvent[] | null,
  timestamp: 0,
  ttlMs: 60_000,
};

type BackendEventParticipant = {
  user_id?: string;
  userId?: string;
  title?: string;
  avatar_url?: string;
  avatarUrl?: string;
  status?: EventParticipant['status'];
};

type BackendEvent = {
  id?: string;
  title?: string;
  description?: string;
  meeting_link?: string;
  meetingLink?: string;
  place_label?: string;
  placeLabel?: string;
  region?: string;
  country?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  scheduled_at?: string;
  scheduledAt?: string;
  created_at?: string;
  createdAt?: string;
  creator_id?: string;
  creatorId?: string;
  creator_name?: string;
  creatorName?: string;
  is_creator?: boolean;
  isCreator?: boolean;
  is_joined?: boolean;
  isJoined?: boolean;
  participant_count?: number;
  participantCount?: number;
  participants?: BackendEventParticipant[];
};

type BackendListEventsResponse = {
  events?: BackendEvent[];
};

type BackendEventResponse = {
  event?: BackendEvent;
};

function normalizeParticipantStatus(value: unknown): EventParticipant['status'] {
  if (value === 2 || value === 'PARTICIPANT_STATUS_CONFIRMED' || value === 'confirmed' || value === 'joined') return 'joined';
  if (value === 3 || value === 'PARTICIPANT_STATUS_DECLINED' || value === 'declined') return 'declined';
  return 'invited';
}

function normalizeParticipant(
  participant: BackendEventParticipant,
): EventParticipant {
  return {
    user_id: participant.user_id ?? participant.userId ?? '',
    title: participant.title ?? '',
    avatar_url: participant.avatar_url ?? participant.avatarUrl ?? '',
    status: normalizeParticipantStatus(participant.status),
  };
}

function normalizeEvent(event: BackendEvent): CommunityEvent {
  const rawDescription = event.description ?? '';
  const parsed = parseEventDescription(rawDescription);
  return {
    id: event.id ?? '',
    title: event.title ?? '',
    description: parsed.description,
    raw_description: rawDescription,
    meeting_link: event.meeting_link ?? event.meetingLink ?? '',
    place_label: event.place_label ?? event.placeLabel ?? '',
    region: event.region ?? '',
    country: event.country ?? '',
    city: event.city ?? '',
    latitude: event.latitude ?? 0,
    longitude: event.longitude ?? 0,
    scheduled_at: event.scheduled_at ?? event.scheduledAt ?? '',
    created_at: event.created_at ?? event.createdAt ?? '',
    creator_id: event.creator_id ?? event.creatorId ?? '',
    creator_name: event.creator_name ?? event.creatorName ?? '',
    is_creator: event.is_creator ?? event.isCreator ?? false,
    is_joined: event.is_joined ?? event.isJoined ?? false,
    participant_count: event.participant_count ?? event.participantCount ?? 0,
    event_color: parsed.meta.color,
    event_group: parsed.meta.group,
    event_type: parsed.meta.type,
    participants: (event.participants ?? []).map(normalizeParticipant),
  };
}

function toProtoTimestamp(value: string): string {
  const localDateTimePattern = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::(\d{2}))?$/;
  const localMatch = value.match(localDateTimePattern);
  if (localMatch) {
    const [, datePart, timePart, secondsPart] = localMatch;
    const date = new Date(`${datePart}T${timePart}:${secondsPart ?? '00'}`);
    const offsetMinutes = -date.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const absoluteOffset = Math.abs(offsetMinutes);
    const offsetHours = String(Math.floor(absoluteOffset / 60)).padStart(2, '0');
    const offsetRestMinutes = String(absoluteOffset % 60).padStart(2, '0');

    return `${datePart}T${timePart}:${secondsPart ?? '00'}${sign}${offsetHours}:${offsetRestMinutes}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toISOString();
}

export const eventApi = {
  list: async (params?: ListQueryParams): Promise<CommunityEvent[]> => {
    const useCache = !params || Object.keys(params).length === 0;
    const now = Date.now();
    if (useCache && defaultEventsCache.data && now - defaultEventsCache.timestamp < defaultEventsCache.ttlMs) {
      return defaultEventsCache.data;
    }
    const response = await apiClient.get<BackendListEventsResponse>('/api/v1/events', {
      params: withDefaultListQuery(params),
    });
    const events = (response.data.events ?? []).map(normalizeEvent);
    if (useCache) {
      defaultEventsCache.data = events;
      defaultEventsCache.timestamp = now;
    }
    return events;
  },
  create: async (payload: CreateEventPayload): Promise<CommunityEvent> => {
    const response = await apiClient.post<BackendEventResponse>('/api/v1/events', {
      title: payload.title,
      description: encodeEventDescription(payload.description, {
        color: payload.event_color,
        group: payload.event_group,
        type: payload.event_type,
      }),
      repeat: payload.repeat ?? 'none',
      meetingLink: payload.meeting_link,
      placeLabel: payload.place_label,
      region: payload.region,
      country: payload.country,
      city: payload.city,
      latitude: payload.latitude,
      longitude: payload.longitude,
      scheduledAt: toProtoTimestamp(payload.scheduled_at),
      invitedUserIds: payload.invited_user_ids,
    });
    defaultEventsCache.data = null;
    defaultEventsCache.timestamp = 0;
    return normalizeEvent(response.data.event ?? {});
  },
  update: async (
    eventId: string,
    payload: Partial<CreateEventPayload>,
  ): Promise<CommunityEvent> => {
    const response = await apiClient.patch<BackendEventResponse>(
      `/api/v1/events/${eventId}`,
      {
        title: payload.title,
        description: encodeEventDescription(payload.description ?? '', {
          color: payload.event_color,
          group: payload.event_group,
          type: payload.event_type,
        }),
        meetingLink: payload.meeting_link,
        placeLabel: payload.place_label,
        scheduledAt: payload.scheduled_at
          ? toProtoTimestamp(payload.scheduled_at)
          : undefined,
      },
    );
    defaultEventsCache.data = null;
    defaultEventsCache.timestamp = 0;
    return normalizeEvent(response.data.event ?? {});
  },
  join: async (eventId: string): Promise<CommunityEvent> => {
    const response = await apiClient.post<BackendEventResponse>(
      `/api/v1/events/${eventId}/join`,
      { eventId },
    );
    defaultEventsCache.data = null;
    defaultEventsCache.timestamp = 0;
    return normalizeEvent(response.data.event ?? {});
  },
  leave: async (eventId: string): Promise<void> => {
    await apiClient.post(`/api/v1/events/${eventId}/leave`, { eventId });
    defaultEventsCache.data = null;
    defaultEventsCache.timestamp = 0;
  },
  delete: async (eventId: string, deleteScope?: 'single' | 'future' | 'all'): Promise<void> => {
    await apiClient.delete(`/api/v1/events/${eventId}`, {
      params: deleteScope ? { deleteScope } : undefined,
    });
    defaultEventsCache.data = null;
    defaultEventsCache.timestamp = 0;
  },
};
