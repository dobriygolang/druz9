import React, { useEffect, useMemo, useRef, useState } from 'react';
import Map, { Marker, MapRef, NavigationControl, ScaleControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Compass, Sparkles, CalendarDays } from 'lucide-react';

import {
  CommunityEvent,
  CommunityMapPoint,
  CreateEventPayload,
} from '@/entities/User/model/types';
import { eventApi } from '@/features/Event/api/eventApi';
import { geoApi } from '@/features/Geo/api/geoApi';
import { COMMUNITY_MAP_STYLE } from '@/shared/config/mapStyle';

import { UserCluster, EventDraft } from '../components/types';
import { UserMarker, ClusterMarker, EventMarker } from '../components/MapMarker';
import { UserDetailCard, EventDetailCard } from '../components/MapOverlayCards';
import { FullEventOverlay } from '@/shared/ui/FullEventOverlay/FullEventOverlay';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { MobileDrawer } from '@/shared/ui/MobileDrawer/MobileDrawer';

type ViewState = {
  longitude: number;
  latitude: number;
  zoom: number;
};

const CLUSTER_BREAK_ZOOM = 9.75;
const CLUSTER_MIN_CELL_SIZE = 0.02;
const CLUSTER_CELL_SIZE_FACTOR = 20;
const MARKER_SPREAD_START_ZOOM = 13.25;

function pluralizeRu(count: number, one: string, few: string, many: string) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

function hasValidEventCoordinates(event: CommunityEvent) {
  return Number.isFinite(event.latitude) &&
    Number.isFinite(event.longitude) &&
    !(event.latitude === 0 && event.longitude === 0);
}

function buildViewState(points: CommunityMapPoint[], events: CommunityEvent[]): ViewState {
  const currentUserPoint = points.find((point) => point.isCurrentUser);
  if (currentUserPoint) {
    return { longitude: currentUserPoint.longitude, latitude: currentUserPoint.latitude, zoom: 10.5 };
  }
  const allCoordinates = [
    ...points.map(p => ({ lng: p.longitude, lat: p.latitude })),
    ...events.filter(hasValidEventCoordinates).map(e => ({ lng: e.longitude, lat: e.latitude })),
  ];
  if (allCoordinates.length === 0) return { longitude: 37.6176, latitude: 55.7558, zoom: 4.5 };
  const totals = allCoordinates.reduce((acc, p) => ({ lng: acc.lng + p.lng, lat: acc.lat + p.lat }), { lng: 0, lat: 0 });
  return { longitude: totals.lng / allCoordinates.length, latitude: totals.lat / allCoordinates.length, zoom: 5 };
}

function distributeByCoordinates<T extends { latitude: number; longitude: number; isCurrentUser?: boolean }>(
  items: T[],
  zoom: number,
): Array<T & { displayLatitude: number; displayLongitude: number }> {
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
    if (group.length === 1 || zoom < MARKER_SPREAD_START_ZOOM) {
      return { ...item, displayLatitude: item.latitude, displayLongitude: item.longitude };
    }

    const pinnedIndex = group.findIndex((candidate) => candidate.isCurrentUser);
    const currentIndex = group.findIndex((candidate) => candidate === item);
    if (currentIndex === pinnedIndex) {
      return { ...item, displayLatitude: item.latitude, displayLongitude: item.longitude };
    }

    const spreadGroup = pinnedIndex >= 0
      ? group.filter((_, index) => index !== pinnedIndex)
      : group;
    const spreadIndex = spreadGroup.findIndex((candidate) => candidate === item);
    const angle = (Math.PI * 2 * spreadIndex) / Math.max(spreadGroup.length, 1);
    const radius = 0.00005 + spreadGroup.length * 0.000012;
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

export const MapPage: React.FC = () => {
  const isMobile = useIsMobile();
  const mapRef = useRef<MapRef | null>(null);
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
  const lastLoadedAtRef = useRef(0);

  const loadData = async (initial = false, force = false) => {
    try {
      if (initial) setIsLoading(true);
      const [p, e] = await Promise.all([
        geoApi.communityMap(force),
        eventApi.list(),
      ]);
      setPoints(p);
      setEvents(e);
      if (initial) setViewState(buildViewState(p, e));
      lastLoadedAtRef.current = Date.now();
    } catch (err) {
      if (initial) setError('Не удалось загрузить данные сообщества');
      console.error(err);
    } finally {
      if (initial) setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData(true);
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        return;
      }
      if (Date.now() - lastLoadedAtRef.current < 60_000) {
        return;
      }
      void loadData(false, true);
    };
    window.addEventListener('focus', handleVisibilityChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('focus', handleVisibilityChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const visibleUserPoints = useMemo(() => distributeByCoordinates(points, viewState.zoom), [points, viewState.zoom]);
  const userClusters = useMemo(() => buildUserClusters(points, viewState.zoom), [points, viewState.zoom]);
  const mappableEvents = useMemo(() => events.filter(hasValidEventCoordinates), [events]);
  const displayEvents = useMemo(() => distributeByCoordinates(mappableEvents, viewState.zoom), [mappableEvents, viewState.zoom]);
  const selectedUser = useMemo(() => visibleUserPoints.find(p => p.userId === selectedUserId), [visibleUserPoints, selectedUserId]);
  const selectedEvent = useMemo(() => events.find(e => e.id === selectedEventId), [events, selectedEventId]);

  const focusMap = (longitude: number, latitude: number, zoom = 10.5) => {
    const nextZoom = Math.max(viewState.zoom, zoom);
    setViewState((current) => ({
      ...current,
      longitude,
      latitude,
      zoom: nextZoom,
    }));
    mapRef.current?.flyTo({
      center: [longitude, latitude],
      zoom: nextZoom,
      duration: 900,
      essential: true,
    });
  };

  const handleMapClick = () => {
    setSelectedUserId(null);
    setSelectedEventId(null);
    setDraftEvent(null);
    setIsEditingEvent(false);
    setFullEventId(null);
    setEventError('');
    setEventFieldErrors({});
    setInviteSearchQuery('');
  };

  const toEventPayload = (draft: EventDraft): CreateEventPayload => ({
    title: draft.title,
    description: draft.description,
    meeting_link: draft.meeting_link,
    place_label: draft.place_label,
    region: draft.region,
    country: draft.country,
    city: draft.city,
    latitude: draft.latitude ?? 0,
    longitude: draft.longitude ?? 0,
    scheduled_at: draft.scheduled_at,
    invited_user_ids: draft.invited_user_ids,
  });

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
      const updated = await eventApi.update(selectedEvent.id, toEventPayload({ ...updatedDraft, title: updatedDraft.title.trim() }));
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
    <div className="fade-in map-page">
      <section className="page-header code-rooms-hero map-hero">
        <div className="code-rooms-hero__copy">
          {!isMobile && <span className="code-rooms-kicker">Community Map</span>}
          <h1>{isMobile ? 'Карта' : 'Карта сообщества'}</h1>
          <p className="code-rooms-subtitle">
            {isMobile 
              ? 'Где сейчас участники и события.' 
              : 'Смотри, где находятся участники и события. Это живая география сообщества.'}
          </p>
        </div>
        {!isMobile && (
          <div className="map-hero__stats">
            <div className="map-hero__stat">
              <Compass size={16} />
              <span>{points.length} {pluralizeRu(points.length, 'участник', 'участника', 'участников')}</span>
            </div>
            <div className="map-hero__stat">
              <CalendarDays size={16} />
              <span>{mappableEvents.length} {pluralizeRu(mappableEvents.length, 'событие', 'события', 'событий')}</span>
            </div>
            <div className="map-hero__stat">
              <Sparkles size={16} />
              <span>live карта</span>
            </div>
          </div>
        )}
      </section>

      <div className="card map-shell" style={{ minHeight: isMobile ? 'calc(100vh - 220px)' : '620px' }}>
        {isLoading && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5, background: 'rgba(17, 24, 39, 0.72)', color: 'white' }}>Загружаем карту...</div>}
        {error && !isLoading && <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 5, background: 'rgba(239, 68, 68, 0.14)', color: '#fecaca', border: '1px solid rgba(239, 68, 68, 0.35)', borderRadius: '12px', padding: '12px 14px' }}>{error}</div>}

        <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 3, display: isMobile ? 'none' : 'flex', gap: '10px' }}>
          <div className="card" style={{ padding: '12px 14px', background: 'rgba(17,24,39,0.88)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>На карте</div>
            <div style={{ fontWeight: 600 }}>{mappableEvents.length} {pluralizeRu(mappableEvents.length, 'событие', 'события', 'событий')}</div>
          </div>
        </div>

        {!isMobile && selectedUser && <UserDetailCard user={selectedUser} onClose={() => setSelectedUserId(null)} />}
        {!isMobile && selectedEvent && (
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
            fieldErrors={eventFieldErrors}
            users={points}
            inviteSearchQuery={inviteSearchQuery}
            setInviteSearchQuery={setInviteSearchQuery}
          />
        )}

        <Map
          ref={mapRef}
          {...viewState}
          onMove={(e) => setViewState(e.viewState)}
          onClick={handleMapClick}
          mapStyle={COMMUNITY_MAP_STYLE}
          attributionControl={false}
          minZoom={2.5}
          maxZoom={18.5}
          reuseMaps
          style={{ width: '100%', height: '620px' }}
        >
          <NavigationControl position="top-right" showCompass={false} visualizePitch={false} />
          <ScaleControl position="bottom-right" unit="metric" />
          {userClusters.map((cluster) => (
            <Marker key={cluster.id} longitude={cluster.longitude} latitude={cluster.latitude} anchor="bottom">
              <button type="button" onClick={(e) => { e.stopPropagation(); focusMap(cluster.longitude, cluster.latitude, viewState.zoom + 2); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <ClusterMarker cluster={cluster} />
              </button>
            </Marker>
          ))}
          {visibleUserPoints.map((p) => (
            <Marker key={p.userId} longitude={p.displayLongitude} latitude={p.displayLatitude} anchor="bottom">
              <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedUserId(p.userId); setSelectedEventId(null); setDraftEvent(null); setIsEditingEvent(false); focusMap(p.longitude, p.latitude, 15.25); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <UserMarker point={p} />
              </button>
            </Marker>
          ))}
          {displayEvents.map((e) => (
            <Marker key={e.id} longitude={e.displayLongitude} latitude={e.displayLatitude} anchor="bottom">
              <button type="button" onClick={(ev) => { ev.stopPropagation(); setSelectedEventId(e.id); setSelectedUserId(null); setIsEditingEvent(false); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <EventMarker event={e} />
              </button>
            </Marker>
          ))}
        </Map>
      </div>

      <FullEventOverlay eventId={fullEventId} events={events} onClose={() => setFullEventId(null)} />

      <MobileDrawer
        isOpen={isMobile && !!selectedUser}
        onClose={() => setSelectedUserId(null)}
        title={selectedUser?.title || 'Профиль'}
      >
        {selectedUser && <UserDetailCard user={selectedUser} onClose={() => setSelectedUserId(null)} />}
      </MobileDrawer>

      <MobileDrawer
        isOpen={isMobile && !!selectedEvent}
        onClose={() => setSelectedEventId(null)}
        title={selectedEvent?.title || 'Событие'}
      >
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
            fieldErrors={eventFieldErrors}
            users={points}
            inviteSearchQuery={inviteSearchQuery}
            setInviteSearchQuery={setInviteSearchQuery}
          />
        )}
      </MobileDrawer>
    </div>
  );
};
