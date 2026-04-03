import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, MapPin, Orbit, Users } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { Circle } from '@/entities/Circle/model/types';
import { CommunityEvent, CommunityMapPoint } from '@/entities/User/model/types';
import { CommunityFiltersBar } from '@/features/Community/ui/CommunityFiltersBar';
import { circleApi } from '@/features/Circle/api/circleApi';
import { eventApi } from '@/features/Event/api/eventApi';
import { geoApi } from '@/features/Geo/api/geoApi';
import { HubShell } from '@/widgets/HubShell/ui/HubShell';

export const CommunityHubPage: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<CommunityMapPoint[]>([]);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);

  useEffect(() => {
    let cancelled = false;

    void Promise.all([
      geoApi.communityMap().catch(() => []),
      eventApi.list().catch(() => []),
      circleApi.list({
        currentUserId: user?.id,
        currentUserRegion: user?.region,
      }).catch(() => []),
    ]).then(([nextUsers, nextEvents, nextCircles]) => {
      if (!cancelled) {
        setUsers(nextUsers);
        setEvents(nextEvents);
        setCircles(nextCircles);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.region]);

  const metrics = useMemo(() => {
    const online = users.filter((item) => item.activityStatus === 'online').length;
    const regions = new Set(users.map((item) => item.region).filter(Boolean)).size;
    const openCircles = circles.filter((item) => item.visibility === 'open').length;
    return { online, regions, openCircles };
  }, [circles, users]);

  return (
    <HubShell
      eyebrow="Community"
      title="People, map, events and circles"
      description="Социальный слой собран в одном месте: больше не нужно переключаться между пятью соседними top-level страницами, чтобы понять, кто рядом и что происходит."
      tabs={[
        { to: '/community/people', label: 'People' },
        { to: '/community/events', label: 'Events' },
        { to: '/community/map', label: 'Map' },
        { to: '/community/circles', label: 'Circles' },
      ]}
      toolbar={<CommunityFiltersBar />}
      aside={(
        <div className="hub-shell__aside-grid">
          <div className="hub-shell__stat-card">
            <Users size={18} />
            <div>
              <strong>{users.length} people</strong>
              <span>{metrics.online} онлайн прямо сейчас</span>
            </div>
          </div>
          <div className="hub-shell__stat-card">
            <CalendarDays size={18} />
            <div>
              <strong>{events.length} events</strong>
              <span>календарь и локальные встречи</span>
            </div>
          </div>
          <div className="hub-shell__stat-card">
            <Orbit size={18} />
            <div>
              <strong>{circles.length} circles</strong>
              <span>{metrics.openCircles} open • {circles.length - metrics.openCircles} closed</span>
            </div>
          </div>
          <div className="hub-shell__stat-card">
            <MapPin size={18} />
            <div>
              <strong>{metrics.regions} regions</strong>
              <span>единая social geography</span>
            </div>
          </div>
        </div>
      )}
    />
  );
};
