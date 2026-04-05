import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Orbit } from 'lucide-react';

import { useAuth } from '@/app/providers/AuthProvider';
import { Circle } from '@/entities/Circle/model/types';
import { CommunityEvent, CommunityMapPoint } from '@/entities/User/model/types';
import { circleApi } from '@/features/Circle/api/circleApi';
import { eventApi } from '@/features/Event/api/eventApi';
import { geoApi } from '@/features/Geo/api/geoApi';

// Module-level cache to avoid re-fetching on every re-render (TTL: 5 min)
type HomeCache = {
  users: CommunityMapPoint[];
  events: CommunityEvent[];
  circles: Circle[];
  userId: string;
  expiresAt: number;
};
let homeCache: HomeCache | null = null;
const HOME_CACHE_TTL = 5 * 60 * 1000;

function formatDate(value: string) {
  const formatter = new Intl.DateTimeFormat('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  const parts = formatter.formatToParts(new Date(value));
  const lookup = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  const weekday = lookup.weekday ? `${lookup.weekday.replace('.', '').charAt(0).toUpperCase()}${lookup.weekday.replace('.', '').slice(1)}` : '';
  const month = lookup.month?.replace('.', '') || '';

  return `${weekday}, ${lookup.day} ${month} · ${lookup.hour}:${lookup.minute}`;
}

function formatParticipantLabel(value: number) {
  const mod10 = value % 10;
  const mod100 = value % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return `${value} участник`;
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${value} участника`;
  }

  return `${value} участников`;
}

function getInitials(firstName?: string, lastName?: string, username?: string) {
  const first = firstName?.trim().charAt(0);
  const last = lastName?.trim().charAt(0);
  if (first || last) {
    return `${first ?? ''}${last ?? ''}`.toUpperCase();
  }

  return username?.trim().slice(0, 2).toUpperCase() || 'U';
}

export const HomePage: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<CommunityMapPoint[]>([]);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      // Serve from cache if still fresh for the same user
      if (
        homeCache &&
        homeCache.userId === (user?.id ?? '') &&
        Date.now() < homeCache.expiresAt
      ) {
        if (!cancelled) {
          setUsers(homeCache.users);
          setEvents(homeCache.events);
          setCircles(homeCache.circles);
          setIsLoading(false);
        }
        return;
      }

      try {
        setIsLoading(true);
        const [nextUsers, nextEvents, nextCircles] = await Promise.all([
          geoApi.communityMap(),
          eventApi.list(),
          circleApi.list({
            currentUserId: user?.id,
            currentUserRegion: user?.region,
          }),
        ]);
        if (!cancelled) {
          homeCache = {
            users: nextUsers,
            events: nextEvents,
            circles: nextCircles,
            userId: user?.id ?? '',
            expiresAt: Date.now() + HOME_CACHE_TTL,
          };
          setUsers(nextUsers);
          setEvents(nextEvents);
          setCircles(nextCircles);
        }
      } catch (error) {
        console.error('Failed to load home dashboard', error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.region]);

  const upcomingEvents = useMemo(
    () => events
      .filter((event) => new Date(event.scheduled_at).getTime() >= Date.now())
      .sort((left, right) => new Date(left.scheduled_at).getTime() - new Date(right.scheduled_at).getTime())
      .slice(0, 3),
    [events],
  );

  const joinedCircles = circles.filter((circle) => circle.joined).slice(0, 3);
  const topCircles = (joinedCircles.length > 0 ? joinedCircles : circles).slice(0, 3);
  const onlineCount = users.filter((item) => item.activityStatus === 'online').length;
  const userName = user?.firstName || user?.username || 'друг';
  const initials = getInitials(user?.firstName, user?.lastName, user?.username);

  return (
    <div className="home-dashboard fade-in">
      <header className="home-dashboard__header">
        <div className="home-dashboard__title">
          <h1>Добро пожаловать, {userName}</h1>
          <p>
            {isLoading ? 'Загружаем сводку сообщества...' : `Сегодня в сообществе ${onlineCount} человек онлайн`}
          </p>
        </div>
        <div className="home-dashboard__avatar" aria-hidden="true">{initials}</div>
      </header>

      <section className="home-dashboard__metrics" aria-label="Ключевые показатели">
        <article className="home-dashboard__metric">
          <span>Онлайн</span>
          <strong>{isLoading ? '...' : onlineCount}</strong>
        </article>
        <article className="home-dashboard__metric">
          <span>Событий</span>
          <strong>{isLoading ? '...' : events.length}</strong>
        </article>
        <article className="home-dashboard__metric">
          <span>Circles</span>
          <strong>{isLoading ? '...' : circles.length}</strong>
        </article>
      </section>

      <section className="home-dashboard__content">
        <article className="home-dashboard__panel">
          <div className="home-dashboard__panel-head">
            <h2>Ближайшие события</h2>
            <Link to="/community/events">Все →</Link>
          </div>
          <div className="home-dashboard__list">
            {upcomingEvents.length > 0 ? upcomingEvents.map((event) => (
              <Link key={event.id} to="/community/events" className="home-dashboard__list-item">
                <strong>{event.title}</strong>
                <span className="home-dashboard__event-meta">{formatDate(event.scheduled_at)} · {event.place_label || event.region || 'Online'}</span>
              </Link>
            )) : (
              <div className="home-dashboard__empty">Пока нет ближайших событий.</div>
            )}
          </div>
        </article>

        <article className="home-dashboard__panel home-dashboard__panel--circles">
          <div className="home-dashboard__panel-head">
            <h2>Мои Circles</h2>
            <Link to="/community/circles">Все →</Link>
          </div>
          <div className="home-dashboard__list">
            {topCircles.length > 0 ? topCircles.map((circle) => (
              <Link key={circle.id} to="/community/circles" className="home-dashboard__circle-item">
                <span className="home-dashboard__circle-icon" aria-hidden="true">
                  <Orbit size={15} />
                </span>
                <div className="home-dashboard__circle-copy">
                  <strong>{circle.name}</strong>
                  <span>{formatParticipantLabel(circle.memberCount)}</span>
                </div>
              </Link>
            )) : (
              <div className="home-dashboard__empty">У тебя пока нет circles.</div>
            )}
          </div>
        </article>
      </section>
    </div>
  );
};
