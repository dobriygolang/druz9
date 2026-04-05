import React, { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';

import { CommunityEvent, CommunityMapPoint } from '@/entities/User/model/types';
import { eventApi } from '@/features/Event/api/eventApi';
import { geoApi } from '@/features/Geo/api/geoApi';

function buildInitials(point: CommunityMapPoint) {
  return `${point.firstName?.charAt(0) ?? ''}${point.lastName?.charAt(0) ?? ''}`.trim().toUpperCase() || point.username.slice(0, 2).toUpperCase();
}

const avatarPalette = ['#f2f3f0', '#4f46e5', '#0891b2', '#7c3aed', '#166534'];

export const MapPage: React.FC = () => {
  const [points, setPoints] = useState<CommunityMapPoint[]>([]);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setIsLoading(true);
        const [nextPoints, nextEvents] = await Promise.all([
          geoApi.communityMap(),
          eventApi.list(),
        ]);
        if (!cancelled) {
          setPoints(nextPoints);
          setEvents(nextEvents);
        }
      } catch (error) {
        console.error('Failed to load community map', error);
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
  }, []);

  const onlineUsers = useMemo(
    () => points.filter((point) => point.activityStatus === 'online').slice(0, 3),
    [points],
  );

  const topMeta = `${points.length} участников · ${events.length} событий · ${onlineUsers.length} онлайн`;

  return (
    <div className="community-screen fade-in">
      <section className="community-screen__header">
        <div className="community-screen__top-row">
          <div className="community-screen__title-block">
            <h1>Community</h1>
          </div>
          <div className="community-screen__meta-text">{isLoading ? 'Загрузка...' : topMeta}</div>
        </div>

        <nav className="community-screen__tabs" aria-label="Community sections">
          <NavLink to="/community/people" className={({ isActive }) => `community-screen__tab${isActive ? ' is-active' : ''}`}>People</NavLink>
          <NavLink to="/community/events" className={({ isActive }) => `community-screen__tab${isActive ? ' is-active' : ''}`}>Events</NavLink>
          <NavLink to="/community/map" className={({ isActive }) => `community-screen__tab${isActive ? ' is-active' : ''}`}>Map</NavLink>
          <NavLink to="/community/circles" className={({ isActive }) => `community-screen__tab${isActive ? ' is-active' : ''}`}>Circles</NavLink>
        </nav>
      </section>

      <section className="community-map-shell">
        <div className="community-map-stage">
          <div className="community-map-stage__legend">
            <span className="is-orange" />
            <span className="is-orange" />
            <span className="is-orange" />
            <span className="is-green" />
            <span className="is-green" />
          </div>
          <div className="community-map-stage__label">
            <div className="community-map-stage__pin" />
            <strong>Интерактивная карта сообщества</strong>
            <span>{points.length} разработчиков онлайн · отображение по регионам</span>
          </div>
          <div className="community-map-stage__dots">
            <span className="dot-a" />
            <span className="dot-b" />
            <span className="dot-c" />
            <span className="dot-d" />
            <span className="dot-e" />
            <span className="dot-f" />
          </div>
        </div>

        <aside className="community-map-panel">
          <div className="community-map-panel__head">Онлайн сейчас</div>
          <div className="community-map-panel__list">
            {isLoading ? (
              <div className="community-screen__empty">Загрузка...</div>
            ) : onlineUsers.map((user, index) => (
              <div key={user.userId} className="community-map-user">
                <div className="community-map-user__avatar" style={{ background: avatarPalette[index % avatarPalette.length], color: index === 0 ? '#111111' : '#fff' }}>
                  {buildInitials(user)}
                </div>
                <div className="community-map-user__info">
                  <strong>{[user.firstName, user.lastName].filter(Boolean).join(' ') || user.username}</strong>
                  <span>{user.region || 'Online'} · {user.username || 'Developer'}</span>
                </div>
                <span className="community-map-user__status" />
              </div>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
};
