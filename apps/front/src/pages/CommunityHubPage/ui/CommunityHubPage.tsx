import React, { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { ArrowRight, CalendarDays, MapPin, Orbit, Users } from 'lucide-react';

import { useAuth } from '@/app/providers/AuthProvider';
import { Circle } from '@/entities/Circle/model/types';
import { CommunityEvent, CommunityMapPoint } from '@/entities/User/model/types';
import { circleApi } from '@/features/Circle/api/circleApi';
import { eventApi } from '@/features/Event/api/eventApi';
import { geoApi } from '@/features/Geo/api/geoApi';

export const CommunityHubPage: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [users, setUsers] = useState<CommunityMapPoint[]>([]);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (isAuthLoading) return () => { cancelled = true; };

    void Promise.all([
      geoApi.communityMap(true).catch(() => [] as CommunityMapPoint[]),
      eventApi.list().catch(() => [] as CommunityEvent[]),
      circleApi.list({ currentUserId: user?.id, currentUserRegion: user?.region }).catch(() => [] as Circle[]),
    ]).then(([nextUsers, nextEvents, nextCircles]) => {
      if (!cancelled) {
        setUsers(nextUsers);
        setEvents(nextEvents);
        setCircles(nextCircles);
        setIsLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [isAuthLoading, user?.id, user?.region]);

  const metrics = useMemo(() => {
    const online = users.filter((item) => item.activityStatus === 'online').length;
    const regions = new Set(users.map((item) => item.region).filter(Boolean)).size;
    const openCircles = circles.filter((item) => item.visibility === 'open').length;
    const upcomingEvents = events.filter((e) => new Date(e.scheduled_at).getTime() >= Date.now()).length;
    return { online, regions, openCircles, upcomingEvents };
  }, [circles, users, events]);

  return (
    <div className="community-hub fade-in">
      {/* Hero */}
      <section className="community-hub__hero">
        <div className="community-hub__hero-copy">
          <span className="hub-shell__eyebrow">Community</span>
          <h1>Люди, события, карта и кружки</h1>
          <p>
            Находи людей рядом, следи за событиями, вступай в circles и смотри карту сообщества.
          </p>
        </div>
        <div className="community-hub__hero-stats">
          <Link to="/community/people" className="community-stat-card">
            <div className="community-stat-card__icon">
              <Users size={20} />
            </div>
            <div className="community-stat-card__body">
              <strong>{isLoading ? '—' : users.length}</strong>
              <span>{isLoading ? '...' : `${metrics.online} онлайн сейчас`}</span>
            </div>
            <ArrowRight size={14} className="community-stat-card__arrow" />
          </Link>

          <Link to="/community/events" className="community-stat-card">
            <div className="community-stat-card__icon" style={{ color: '#f59e0b' }}>
              <CalendarDays size={20} />
            </div>
            <div className="community-stat-card__body">
              <strong>{isLoading ? '—' : events.length}</strong>
              <span>{isLoading ? '...' : `${metrics.upcomingEvents} предстоящих`}</span>
            </div>
            <ArrowRight size={14} className="community-stat-card__arrow" />
          </Link>

          <Link to="/community/circles" className="community-stat-card">
            <div className="community-stat-card__icon" style={{ color: '#8b5cf6' }}>
              <Orbit size={20} />
            </div>
            <div className="community-stat-card__body">
              <strong>{isLoading ? '—' : circles.length}</strong>
              <span>{isLoading ? '...' : `${metrics.openCircles} открытых`}</span>
            </div>
            <ArrowRight size={14} className="community-stat-card__arrow" />
          </Link>

          <Link to="/community/map" className="community-stat-card">
            <div className="community-stat-card__icon" style={{ color: '#10b981' }}>
              <MapPin size={20} />
            </div>
            <div className="community-stat-card__body">
              <strong>{isLoading ? '—' : `${metrics.regions}`}</strong>
              <span>регионов на карте</span>
            </div>
            <ArrowRight size={14} className="community-stat-card__arrow" />
          </Link>
        </div>
      </section>

      {/* Sub-nav */}
      <nav className="hub-shell__tabs">
        {[
          { to: '/community/people', label: 'People' },
          { to: '/community/events', label: 'Events' },
          { to: '/community/map', label: 'Map' },
          { to: '/community/circles', label: 'Circles' },
        ].map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) => `hub-shell__tab ${isActive ? 'is-active' : ''}`}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <div className="hub-shell__content">
        <Outlet />
      </div>
    </div>
  );
};
