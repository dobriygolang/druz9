import React, { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Plus, Users, Code2 } from 'lucide-react';

import { useAuth } from '@/app/providers/AuthProvider';
import { Circle } from '@/entities/Circle/model/types';
import { circleApi } from '@/features/Circle/api/circleApi';

function participantLabel(count: number) {
  if (count % 10 === 1 && count % 100 !== 11) return `${count} участник`;
  if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14)) return `${count} участника`;
  return `${count} участников`;
}

export const CirclesPage: React.FC = () => {
  const { user } = useAuth();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setIsLoading(true);
        const data = await circleApi.list({
          currentUserId: user?.id,
          currentUserRegion: user?.region,
        });
        if (!cancelled) {
          setCircles(data);
        }
      } catch (error) {
        console.error('Failed to load circles', error);
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

  const cards = useMemo(() => circles.slice(0, 6), [circles]);
  const totalMembers = circles.reduce((acc, circle) => acc + circle.memberCount, 0);

  return (
    <div className="community-screen fade-in">
      <section className="community-screen__header">
        <div className="community-screen__top-row">
          <div className="community-screen__title-block">
            <h1>Community</h1>
          </div>
          <div className="community-screen__header-actions">
            <span className="community-screen__meta-text">{isLoading ? 'Загрузка...' : `${totalMembers} участников в кругах`}</span>
            <button type="button" className="community-screen__cta">
              <Plus size={16} />
              <span>Создать Circle</span>
            </button>
          </div>
        </div>

        <nav className="community-screen__tabs" aria-label="Community sections">
          <NavLink to="/community/people" className={({ isActive }) => `community-screen__tab${isActive ? ' is-active' : ''}`}>People</NavLink>
          <NavLink to="/community/events" className={({ isActive }) => `community-screen__tab${isActive ? ' is-active' : ''}`}>Events</NavLink>
          <NavLink to="/community/map" className={({ isActive }) => `community-screen__tab${isActive ? ' is-active' : ''}`}>Map</NavLink>
          <NavLink to="/community/circles" className={({ isActive }) => `community-screen__tab${isActive ? ' is-active' : ''}`}>Circles</NavLink>
        </nav>
      </section>

      <section className="community-circles-grid">
        {isLoading ? (
          <div className="community-screen__empty">Загрузка circles...</div>
        ) : cards.length > 0 ? (
          cards.map((circle) => (
            <article key={circle.id} className="community-circle-card">
              <div className="community-circle-card__top">
                <div className="community-circle-card__icon">
                  <Code2 size={18} />
                </div>
                <span className="community-circle-card__badge">{circle.joined ? 'Участник' : circle.visibility === 'open' ? 'Открыт' : 'Приватный'}</span>
              </div>
              <h2>{circle.name}</h2>
              <p>{circle.description}</p>
              <div className="community-circle-card__meta">
                <Users size={12} />
                <span>{participantLabel(circle.memberCount)}</span>
              </div>
            </article>
          ))
        ) : (
          <div className="community-screen__empty">Пока нет circles.</div>
        )}
      </section>
    </div>
  );
};
