import React, { useEffect, useMemo, useState } from 'react';
import Map, { Marker } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

import {
  CommunityEvent,
  CommunityMapPoint,
} from '@/entities/User/model/types';
import { eventApi } from '@/features/Event/api/eventApi';
import { geoApi } from '@/features/Geo/api/geoApi';
import { DARK_MAP_STYLE } from '@/shared/config/mapStyle';

import { UserCluster, EventDraft } from '../components/types';
import { UserMarker, ClusterMarker, EventMarker } from '../components/MapMarker';
import { UserDetailCard, EventDetailCard } from '../components/MapOverlayCards';
import { FullEventOverlay } from '@/shared/ui/FullEventOverlay/FullEventOverlay';
import { EventForm } from '@/shared/ui/EventForm/EventForm';
import { useIsMobile } from '@/shared/hooks/useIsMobile';

type ViewState = {
  longitude: number;
  latitude: number;
  zoom: number;
};

const CLUSTER_BREAK_ZOOM = 10.5;
const CLUSTER_MIN_CELL_SIZE = 0.02;
const CLUSTER_CELL_SIZE_FACTOR = 20;

function buildViewState(points: CommunityMapPoint[], events: CommunityEvent[]): ViewState {
  const currentUserPoint = points.find((point) => point.isCurrentUser);
  if (currentUserPoint) {
    return { longitude: currentUserPoint.longitude, latitude: currentUserPoint.latitude, zoom: 9 };
  }
  const allCoordinates = [
    ...points.map(p => ({ lng: p.longitude, lat: p.latitude })),
    ...events.map(e => ({ lng: e.longitude, lat: e.latitude })),
  ];
  if (allCoordinates.length === 0) return { longitude: 37.6176, latitude: 55.7558, zoom: 4.5 };
  const totals = allCoordinates.reduce((acc, p) => ({ lng: acc.lng + p.lng, lat: acc.lat + p.lat }), { lng: 0, lat: 0 });
  return { longitude: totals.lng / allCoordinates.length, latitude: totals.lat / allCoordinates.length, zoom: 5 };
}

function distributeByCoordinates<T extends { latitude: number; longitude: number }>(items: T[]): Array<T & { displayLatitude: number; displayLongitude: number }> {
  const groups = new globalThis.Map<string, T[]>();
  items.forEach((item) => {
    const key = `${item.latitude.toFixed(5)}:${item.longitude.toFixed(5)}`;
    const bucket = groups.get(key) ?? [];
    bucket.push(item);
    groups.set(key, bucket);
  });
  return items.map((item) => {
    const key = `${item.latitude.toFixed(5)}:${item.longitude.toFixed(5)}`;
    const group = groups.get(key) ?? [item];
    if (group.length === 1) return { ...item, displayLatitude: item.latitude, displayLongitude: item.longitude };
    const index = group.findIndex((candidate) => candidate === item);
    const angle = (Math.PI * 2 * index) / group.length;
    const radius = 0.00045 + group.length * 0.00003;
    return {
      ...item,
      displayLatitude: item.latitude + Math.sin(angle) * radius,
      displayLongitude: item.longitude + (Math.cos(angle) * radius / Math.max(Math.cos(item.latitude * (Math.PI / 180)), 0.3)),
    };
  });
}

function buildUserClusters(points: CommunityMapPoint[], zoom: number): UserCluster[] {
  if (zoom >= CLUSTER_BREAK_ZOOM) return [];
  const cellSize = Math.max(CLUSTER_MIN_CELL_SIZE, CLUSTER_CELL_SIZE_FACTOR / Math.pow(2, zoom + 2));
  const groups = new globalThis.Map<string, CommunityMapPoint[]>();
  points.forEach((point) => {
    const latIndex = Math.floor(point.latitude / cellSize);
    const lonIndex = Math.floor(point.longitude / cellSize);
    const key = `${latIndex}:${lonIndex}`;
    const bucket = groups.get(key) ?? [];
    bucket.push(point);
    groups.set(key, bucket);
  });
  return Array.from(groups.entries()).filter(([, bucket]) => bucket.length > 1).map(([key, bucket]) => {
    const totals = bucket.reduce((acc, p) => ({ lat: acc.lat + p.latitude, lng: acc.lng + p.longitude }), { lat: 0, lng: 0 });
    const sample = bucket.find(p => p.avatarUrl) ?? bucket.find(p => p.isCurrentUser) ?? bucket[0];
    return { id: key, latitude: totals.lat / bucket.length, longitude: totals.lng / bucket.length, count: bucket.length, points: bucket, sample };
  });
}

function buildDefaultScheduledAt() {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export const MapPage: React.FC = () => {
  const isMobile = useIsMobile();
  const [points, setPoints] = useState<CommunityMapPoint[]>([]);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewState, setViewState] = useState<ViewState>({ longitude: 37.6176, latitude: 55.7558, zoom: 4.5 });
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [draftEvent, setDraftEvent] = useState<EventDraft | null>(null);
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [eventError, setEventError] = useState('');
  const [eventFieldErrors, setEventFieldErrors] = useState<{
    title?: string;
    scheduledAt?: string;
    meetingLink?: string;
  }>({});
  const [fullEventId, setFullEventId] = useState<string | null>(null);
  const [inviteSearchQuery, setInviteSearchQuery] = useState('');

  useEffect(() => {
    const load = async (initial = false) => {
      try {
        if (initial) setIsLoading(true);
        const [p, e] = await Promise.all([
          geoApi.communityMap(),
          eventApi.list(),
        ]);
        setPoints(p);
        setEvents(e);
        if (initial) setViewState(buildViewState(p, e));
      } catch (err) {
        if (initial) setError('Не удалось загрузить данные сообщества');
        console.error(err);
      } finally {
        if (initial) setIsLoading(false);
      }
    };
    
    void load(true);
    const interval = setInterval(() => void load(false), 30000);
    return () => clearInterval(interval);
  }, []);

  const visibleUserPoints = useMemo(() => distributeByCoordinates(points), [points]);
  const userClusters = useMemo(() => buildUserClusters(points, viewState.zoom), [points, viewState.zoom]);
  const displayEvents = useMemo(() => distributeByCoordinates(events), [events]);
  const selectedUser = useMemo(() => visibleUserPoints.find(p => p.userId === selectedUserId), [visibleUserPoints, selectedUserId]);
  const selectedEvent = useMemo(() => events.find(e => e.id === selectedEventId), [events, selectedEventId]);

  const handleMapClick = (event: { lngLat: { lng: number; lat: number } }) => {
    setSelectedUserId(null);
    setSelectedEventId(null);
    setIsEditingEvent(false);
    setFullEventId(null);
    setEventError('');
    setEventFieldErrors({});
    setInviteSearchQuery('');

    const lat = Number(event.lngLat.lat.toFixed(6));
    const lng = Number(event.lngLat.lng.toFixed(6));

    setDraftEvent({
      latitude: lat,
      longitude: lng,
      title: '',
      description: '',
      meeting_link: '',
      place_label: `Точка на карте • ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      region: '',
      country: '',
      city: '',
      scheduled_at: buildDefaultScheduledAt(),
      invited_user_ids: [],
    });
  };

  const handleCreateEvent = async () => {
    if (!draftEvent) {
      return;
    }

    const nextFieldErrors: {
      title?: string;
      scheduledAt?: string;
      meetingLink?: string;
    } = {};

    if (!draftEvent.title.trim()) {
      nextFieldErrors.title = 'Введите название';
    }
    if (!draftEvent.scheduled_at) {
      nextFieldErrors.scheduledAt = 'Укажите дату и время';
    }
    if (
      draftEvent.meeting_link.trim() &&
      !/^https?:\/\//i.test(draftEvent.meeting_link.trim())
    ) {
      nextFieldErrors.meetingLink =
        'Ссылка должна начинаться с http:// или https://';
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setEventFieldErrors(nextFieldErrors);
      setEventError('');
      return;
    }

    setIsSavingEvent(true);
    setEventError('');
    setEventFieldErrors({});
    try {
      const created = await eventApi.create({ ...draftEvent, title: draftEvent.title.trim() } as any);
      setEvents(curr => [...curr, created]);
      setDraftEvent(null);
      setSelectedEventId(created.id);
    } catch (err) {
      setEventError('Не удалось создать событие');
      console.error(err);
    } finally {
      setIsSavingEvent(false);
    }
  };

  const handleUpdateEvent = async (updatedDraft: EventDraft) => {
    if (!selectedEvent) return;

    const nextFieldErrors: {
      title?: string;
      scheduledAt?: string;
      meetingLink?: string;
    } = {};

    if (!updatedDraft.title.trim()) {
      nextFieldErrors.title = 'Введите название';
    }
    if (!updatedDraft.scheduled_at) {
      nextFieldErrors.scheduledAt = 'Укажите дату и время';
    }
    if (
      updatedDraft.meeting_link.trim() &&
      !/^https?:\/\//i.test(updatedDraft.meeting_link.trim())
    ) {
      nextFieldErrors.meetingLink =
        'Ссылка должна начинаться с http:// или https://';
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setEventFieldErrors(nextFieldErrors);
      setEventError('');
      return;
    }

    setIsSavingEvent(true);
    setEventError('');
    setEventFieldErrors({});
    try {
      const updated = await eventApi.update(selectedEvent.id, { ...updatedDraft, title: updatedDraft.title.trim() } as any);
      setEvents(curr => curr.map(e => e.id === updated.id ? updated : e));
      setIsEditingEvent(false);
    } catch (err) {
      setEventError('Не удалось обновить событие');
      console.error(err);
    } finally {
      setIsSavingEvent(false);
    }
  };

  const handleJoinToggle = async (eventItem: CommunityEvent) => {
    try {
      if (eventItem.is_joined && !eventItem.is_creator) {
        await eventApi.leave(eventItem.id);
        setEvents(curr => curr.map(item => item.id === eventItem.id ? { ...item, is_joined: false, participants: item.participants.filter(p => p.user_id !== item.creator_id) } : item));
        return;
      }
      const updated = await eventApi.join(eventItem.id);
      setEvents(curr => curr.map(item => item.id === updated.id ? updated : item));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await eventApi.delete(eventId);
      setEvents(curr => curr.filter(e => e.id !== eventId));
      setSelectedEventId(null);
    } catch (err) {
      console.error('Failed to delete event:', err);
    }
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '28px', marginBottom: '12px', fontWeight: '600' }}>Карта сообщества</h1>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Находите пользователей и события по всему миру. Создание событий доступно кликом по карте или во вкладке «События».
        </p>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', minHeight: isMobile ? 'calc(100vh - 220px)' : '620px', position: 'relative', background: '#111827' }}>
        {isLoading && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5, background: 'rgba(17, 24, 39, 0.72)', color: 'white' }}>Загружаем карту...</div>}
        {error && !isLoading && <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 5, background: 'rgba(239, 68, 68, 0.14)', color: '#fecaca', border: '1px solid rgba(239, 68, 68, 0.35)', borderRadius: '12px', padding: '12px 14px' }}>{error}</div>}

        <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 3, display: 'flex', gap: '10px' }}>
          <div className="card" style={{ padding: '12px 14px', background: 'rgba(17,24,39,0.88)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>События</div>
            <div style={{ fontWeight: 600 }}>{events.length}</div>
          </div>
        </div>

        {draftEvent && !selectedEventId && (
          <div style={{
            position: 'absolute',
            top: '88px',
            right: '16px',
            zIndex: 10,
            width: 'min(380px, calc(100% - 32px))',
            maxHeight: 'calc(100% - 104px)',
            overflowY: 'auto',
            borderRadius: '16px',
            scrollbarWidth: 'none',
          }} className="hide-scrollbar">
            <EventForm
              title="Новое событие"
              draft={draftEvent}
              setDraft={setDraftEvent}
              onClose={() => setDraftEvent(null)}
              onSubmit={handleCreateEvent}
              isSaving={isSavingEvent}
              error={eventError}
              fieldErrors={eventFieldErrors}
              users={points}
              inviteSearchQuery={inviteSearchQuery}
              setInviteSearchQuery={setInviteSearchQuery}
            />
          </div>
        )}

        {selectedUser && <UserDetailCard user={selectedUser} onClose={() => setSelectedUserId(null)} />}
        {selectedEvent && (
          <EventDetailCard
            event={selectedEvent}
            isEditing={isEditingEvent}
            setIsEditing={setIsEditingEvent}
            draft={draftEvent}
            setDraft={setDraftEvent}
            onClose={() => setSelectedEventId(null)}
            onExpand={setFullEventId}
            onSave={handleUpdateEvent}
            onDelete={handleDeleteEvent}
            onJoinToggle={handleJoinToggle}
            isSaving={isSavingEvent}
            error={eventError}
            users={points}
            inviteSearchQuery={inviteSearchQuery}
            setInviteSearchQuery={setInviteSearchQuery}
          />
        )}

        <Map
          {...viewState}
          onMove={(e) => setViewState(e.viewState)}
          onClick={handleMapClick}
          mapStyle={DARK_MAP_STYLE}
          attributionControl={false}
          reuseMaps
          style={{ width: '100%', height: '620px' }}
        >
          {userClusters.map((cluster) => (
            <Marker key={cluster.id} longitude={cluster.longitude} latitude={cluster.latitude} anchor="bottom">
              <button type="button" onClick={(e) => { e.stopPropagation(); setViewState({ ...viewState, zoom: viewState.zoom + 2, longitude: cluster.longitude, latitude: cluster.latitude }); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <ClusterMarker cluster={cluster} />
              </button>
            </Marker>
          ))}
          {visibleUserPoints.map((p) => (
            <Marker key={p.userId} longitude={p.displayLongitude} latitude={p.displayLatitude} anchor="bottom">
              <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedUserId(p.userId); setSelectedEventId(null); setDraftEvent(null); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <UserMarker point={p} />
              </button>
            </Marker>
          ))}
          {displayEvents.map((e) => (
            <Marker key={e.id} longitude={e.displayLongitude} latitude={e.displayLatitude} anchor="bottom">
              <button type="button" onClick={(ev) => { ev.stopPropagation(); setSelectedEventId(e.id); setSelectedUserId(null); setDraftEvent(null); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <EventMarker event={e} />
              </button>
            </Marker>
          ))}
        </Map>
      </div>

      <FullEventOverlay eventId={fullEventId} events={events} onClose={() => setFullEventId(null)} />
    </div>
  );
};
