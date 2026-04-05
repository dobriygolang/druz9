import React, { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Plus, Users } from 'lucide-react';

import { useAuth } from '@/app/providers/AuthProvider';
import { CommunityEvent } from '@/entities/User/model/types';
import { eventApi } from '@/features/Event/api/eventApi';

function formatEventDate(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date).replace(',', ' ·');
}

function eventBadge(event: CommunityEvent) {
  if (event.place_label || event.region) {
    return event.place_label || event.region;
  }
  return 'Online';
}

export const EventsPage: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setIsLoading(true);
        const data = await eventApi.list();
        if (!cancelled) {
          setEvents(data);
        }
      } catch (error) {
        console.error('Failed to load events', error);
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

  const cards = useMemo(
    () => events
      .slice()
      .sort((left, right) => new Date(left.scheduled_at).getTime() - new Date(right.scheduled_at).getTime())
      .slice(0, 6),
    [events],
  );

  return (
    <div className="community-screen fade-in">
      <section className="community-screen__header">
        <div className="community-screen__top-row">
          <div className="community-screen__title-block">
            <h1>Community</h1>
            <p>{isLoading ? 'Загружаем события...' : `${events.length} событий в этом месяце`}</p>
          </div>

          {user?.isAdmin && (
            <button type="button" className="community-screen__cta">
              <Plus size={16} />
              <span>Создать событие</span>
            </button>
          )}
        </div>

        <nav className="community-screen__tabs" aria-label="Community sections">
          <NavLink to="/community/people" className={({ isActive }) => `community-screen__tab${isActive ? ' is-active' : ''}`}>People</NavLink>
          <NavLink to="/community/events" className={({ isActive }) => `community-screen__tab${isActive ? ' is-active' : ''}`}>Events</NavLink>
          <NavLink to="/community/map" className={({ isActive }) => `community-screen__tab${isActive ? ' is-active' : ''}`}>Map</NavLink>
          <NavLink to="/community/circles" className={({ isActive }) => `community-screen__tab${isActive ? ' is-active' : ''}`}>Circles</NavLink>
        </nav>
      </section>

      <section className="community-events-grid">
        {isLoading ? (
          <div className="community-screen__empty">Загрузка событий...</div>
        ) : cards.length > 0 ? (
          cards.map((event) => (
            <article key={event.id} className="community-event-card">
              <div className="community-event-card__top">
                <span className={`community-event-card__badge${eventBadge(event) === 'Online' ? ' is-online' : ''}`}>{eventBadge(event)}</span>
                <span className="community-event-card__date">{formatEventDate(event.scheduled_at)}</span>
              </div>
              <h2>{event.title}</h2>
              <p>{event.description || event.raw_description || 'Событие сообщества.'}</p>
              <div className="community-event-card__meta">
                <Users size={12} />
                <span>{event.participant_count} участников</span>
              </div>
            </article>
          ))
        ) : (
          <div className="community-screen__empty">Пока нет событий.</div>
        )}
      </section>
    </div>
  );
};
