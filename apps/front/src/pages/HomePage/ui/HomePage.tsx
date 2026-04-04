import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, CirclePlay, Orbit } from 'lucide-react';

import { useAuth } from '@/app/providers/AuthProvider';
import { usePodcast } from '@/app/providers/PodcastProvider';
import { Circle } from '@/entities/Circle/model/types';
import { CommunityEvent, CommunityMapPoint, Podcast } from '@/entities/User/model/types';
import { circleApi } from '@/features/Circle/api/circleApi';
import { eventApi } from '@/features/Event/api/eventApi';
import { geoApi } from '@/features/Geo/api/geoApi';
import { podcastApi } from '@/features/Podcast/api/podcastApi';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export const HomePage: React.FC = () => {
  const { user } = useAuth();
  const { currentPodcast, isPlaying, playPodcast } = usePodcast();
  const [users, setUsers] = useState<CommunityMapPoint[]>([]);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setIsLoading(true);
        const [nextUsers, nextEvents, nextCircles, nextPodcasts] = await Promise.all([
          geoApi.communityMap(),
          eventApi.list(),
          circleApi.list({ currentUserId: user?.id, currentUserRegion: user?.region }),
          podcastApi.list({ limit: 3 }),
        ]);
        if (!cancelled) {
          setUsers(nextUsers);
          setEvents(nextEvents);
          setCircles(nextCircles);
          setPodcasts(nextPodcasts);
        }
      } catch (error) {
        console.error('Failed to load home dashboard', error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [user?.id, user?.region]);

  const upcomingEvents = useMemo(
    () => events
      .filter((e) => new Date(e.scheduled_at).getTime() >= Date.now())
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
      .slice(0, 3),
    [events],
  );

  const topCircles = useMemo(
    () => (circles.filter((c) => c.joined).length > 0
      ? circles.filter((c) => c.joined)
      : circles).slice(0, 3),
    [circles],
  );

  const onlineCount = users.filter((u) => u.activityStatus === 'online').length;

  return (
    <div className="home-page fade-in">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="home-header">
        <div className="home-header__left">
          <h1 className="home-header__title">
            {user ? `Привет, ${user.firstName}` : 'Добро пожаловать'}
          </h1>
          <p className="home-header__sub">
            {isLoading ? 'Загружаем данные…' : `${onlineCount} человек онлайн в сообществе`}
          </p>
        </div>
        {user && (
          <div className="home-header__avatar">
            {getInitials(user.firstName, user.lastName)}
          </div>
        )}
      </div>

      {/* ── Metrics ────────────────────────────────────────────── */}
      <div className="home-metrics">
        <div className="home-metric-card">
          <span>Онлайн</span>
          <strong>{isLoading ? '…' : onlineCount}</strong>
        </div>
        <div className="home-metric-card">
          <span>Событий на неделе</span>
          <strong>{isLoading ? '…' : upcomingEvents.length}</strong>
        </div>
        <div className="home-metric-card">
          <span>Circles</span>
          <strong>{isLoading ? '…' : circles.length}</strong>
        </div>
      </div>

      {/* ── Content columns ────────────────────────────────────── */}
      <div className="home-content">

        {/* Events */}
        <article className="home-panel home-panel--events">
          <div className="home-panel__head">
            <h2>Ближайшие события</h2>
            <Link to="/community/events" className="home-panel__link">Все →</Link>
          </div>
          <div className="home-event-list">
            {upcomingEvents.length > 0 ? upcomingEvents.map((event) => (
              <div key={event.id} className="home-event-item">
                <div className="home-event-item__body">
                  <strong>{event.title}</strong>
                  <span>{formatDate(event.scheduled_at)}</span>
                </div>
                <div className="home-event-item__meta">
                  <CalendarDays size={12} />
                  <span>{event.region || 'Online'}</span>
                </div>
              </div>
            )) : (
              <div className="home-empty">Пока нет ближайших событий.</div>
            )}
          </div>
        </article>

        {/* Circles */}
        <article className="home-panel home-panel--circles">
          <div className="home-panel__head">
            <h2>Мои Circles</h2>
            <Link to="/community/circles" className="home-panel__link">Все →</Link>
          </div>
          <div className="home-circle-list">
            {topCircles.length > 0 ? topCircles.map((circle) => (
              <Link key={circle.id} to="/community/circles" className="home-circle-item">
                <div className="home-circle-item__icon">
                  <Orbit size={14} />
                </div>
                <div className="home-circle-item__body">
                  <strong>{circle.name}</strong>
                  <span>{circle.memberCount} участников</span>
                </div>
              </Link>
            )) : (
              <div className="home-empty">Circles пока не собраны.</div>
            )}
          </div>
        </article>

      </div>

      {/* ── Podcasts ───────────────────────────────────────────── */}
      {podcasts.length > 0 && (
        <article className="home-panel home-panel--podcasts">
          <div className="home-panel__head">
            <h2>Подкасты</h2>
          </div>
          <div className="home-podcast-list">
            {podcasts.map((podcast) => {
              const isActive = currentPodcast?.id === podcast.id;
              return (
                <button
                  key={podcast.id}
                  type="button"
                  className={`home-podcast-item${isActive ? ' is-active' : ''}`}
                  onClick={() => void playPodcast(podcast)}
                >
                  <CirclePlay size={16} className="home-podcast-item__icon" />
                  <div className="home-podcast-item__body">
                    <strong>{podcast.title}</strong>
                    <span>
                      {isActive && isPlaying
                        ? 'Играет'
                        : `${Math.max(1, Math.round(podcast.duration_seconds / 60))} мин`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </article>
      )}

    </div>
  );
};
