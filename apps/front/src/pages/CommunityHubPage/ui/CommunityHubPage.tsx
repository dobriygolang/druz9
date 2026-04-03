import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, MapPin, Orbit, Users } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { Circle } from '@/entities/Circle/model/types';
import { CommunityEvent, CommunityMapPoint } from '@/entities/User/model/types';
import { circleApi } from '@/features/Circle/api/circleApi';
import { eventApi } from '@/features/Event/api/eventApi';
import { geoApi } from '@/features/Geo/api/geoApi';
import { HubShell } from '@/widgets/HubShell/ui/HubShell';

export const CommunityHubPage: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [users, setUsers] = useState<CommunityMapPoint[]>([]);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (isAuthLoading) {
      return () => {
        cancelled = true;
      };
    }

    void Promise.all([
      geoApi.communityMap(true).catch(() => []),
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
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isAuthLoading, user?.id, user?.region]);

  const metrics = useMemo(() => {
    const online = users.filter((item) => item.activityStatus === 'online').length;
    const regions = new Set(users.map((item) => item.region).filter(Boolean)).size;
    const openCircles = circles.filter((item) => item.visibility === 'open').length;
    return { online, regions, openCircles };
  }, [circles, users]);

  return (
    <HubShell
      eyebrow="Community"
      title="Люди, события, карта и circles"
      description="Community теперь работает как один социальный слой. Сверху обзор, а внутри отдельных вкладок уже конкретные сценарии: люди, события, карта и мини-комьюнити."
      tabs={[
        { to: '/community/people', label: 'People' },
        { to: '/community/events', label: 'Events' },
        { to: '/community/map', label: 'Map' },
        { to: '/community/circles', label: 'Circles' },
      ]}
      aside={(
        <div className="hub-shell__aside-grid">
          <div className="hub-shell__stat-card">
            <Users size={18} />
            <div>
              <strong>{isLoading ? '...' : `${users.length} человек`}</strong>
              <span>{isLoading ? 'Собираем список участников' : `${metrics.online} онлайн прямо сейчас`}</span>
            </div>
          </div>
          <div className="hub-shell__stat-card">
            <CalendarDays size={18} />
            <div>
              <strong>{isLoading ? '...' : `${events.length} событий`}</strong>
              <span>{isLoading ? 'Подтягиваем календарь' : 'календарь и локальные встречи'}</span>
            </div>
          </div>
          <div className="hub-shell__stat-card">
            <Orbit size={18} />
            <div>
              <strong>{isLoading ? '...' : `${circles.length} circles`}</strong>
              <span>{isLoading ? 'Собираем мини-комьюнити' : `${metrics.openCircles} open • ${circles.length - metrics.openCircles} closed`}</span>
            </div>
          </div>
          <div className="hub-shell__stat-card">
            <MapPin size={18} />
            <div>
              <strong>{isLoading ? '...' : `${metrics.regions} регионов`}</strong>
              <span>{isLoading ? 'Строим social geography' : 'единая social geography'}</span>
            </div>
          </div>
        </div>
      )}
    />
  );
};
