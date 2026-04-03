import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Code2, Orbit, Sparkles, Trophy, Users } from 'lucide-react';

import { useAuth } from '@/app/providers/AuthProvider';
import { Circle } from '@/entities/Circle/model/types';
import { CommunityEvent, CommunityMapPoint } from '@/entities/User/model/types';
import { circleApi } from '@/features/Circle/api/circleApi';
import { eventApi } from '@/features/Event/api/eventApi';
import { geoApi } from '@/features/Geo/api/geoApi';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
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

  return (
    <div className="home-page fade-in">
      <section className="home-hero">
        <div className="home-hero__copy">
          <span className="home-hero__eyebrow">Home</span>
          <h1>Один вход в продукт вместо набора несвязанных разделов</h1>
          <p>
            Здесь собраны ближайшие события, активные circles и social/practice/growth входы,
            чтобы продукт ощущался как одна система, а не набор отдельных экранов.
          </p>
        </div>

        <div className="home-hero__metrics">
          <div className="home-metric">
            <span>Онлайн</span>
            <strong>{isLoading ? '...' : onlineCount}</strong>
          </div>
          <div className="home-metric">
            <span>Ближайшие events</span>
            <strong>{isLoading ? '...' : upcomingEvents.length}</strong>
          </div>
          <div className="home-metric">
            <span>Активные circles</span>
            <strong>{isLoading ? '...' : circles.length}</strong>
          </div>
        </div>
      </section>

      <section className="home-clusters">
        <Link to="/community/people" className="home-cluster-card">
          <Users size={22} />
          <div>
            <strong>Community</strong>
            <p>Люди, карта, события и circles в одном социальном слое.</p>
          </div>
          <ArrowRight size={18} />
        </Link>

        <Link to="/practice/code-rooms" className="home-cluster-card">
          <Code2 size={22} />
          <div>
            <strong>Practice</strong>
            <p>Code Rooms, arena и тренировочные сценарии без отдельной навигационной ветки под каждую механику.</p>
          </div>
          <ArrowRight size={18} />
        </Link>

        <Link to="/growth/interview-prep" className="home-cluster-card">
          <Sparkles size={22} />
          <div>
            <strong>Growth</strong>
            <p>Interview Prep и вакансии как трек роста, а не пара разрозненных страниц.</p>
          </div>
          <ArrowRight size={18} />
        </Link>
      </section>

      <section className="home-grid">
        <article className="home-panel">
          <div className="home-panel__head">
            <div>
              <span>Upcoming</span>
              <h2>События рядом</h2>
            </div>
            <Link to="/community/events">Открыть</Link>
          </div>
          <div className="home-list">
            {upcomingEvents.length > 0 ? upcomingEvents.map((event) => (
              <div key={event.id} className="home-list__item">
                <div>
                  <strong>{event.title}</strong>
                  <span>{formatDate(event.scheduled_at)}</span>
                </div>
                <div className="home-list__meta">
                  <CalendarDays size={14} />
                  <span>{event.region || 'Online'}</span>
                </div>
              </div>
            )) : <div className="home-empty">Пока нет ближайших событий.</div>}
          </div>
        </article>

        <article className="home-panel">
          <div className="home-panel__head">
            <div>
              <span>Circles</span>
              <h2>Мини-комьюнити</h2>
            </div>
            <Link to="/community/circles">Все circles</Link>
          </div>
          <div className="home-list">
            {topCircles.length > 0 ? topCircles.map((circle) => (
              <div key={circle.id} className="home-list__item">
                <div>
                  <strong>{circle.name}</strong>
                  <span>{circle.memberCount} участников • {circle.visibility === 'open' ? 'открытый' : 'закрытый'}</span>
                </div>
                <div className="home-list__meta">
                  <Orbit size={14} />
                  <span>{circle.hubLabel}</span>
                </div>
              </div>
            )) : <div className="home-empty">Circles пока не собраны.</div>}
          </div>
        </article>

        <article className="home-panel">
          <div className="home-panel__head">
            <div>
              <span>Arena</span>
              <h2>Practice snapshot</h2>
            </div>
            <Link to="/practice/arena">В practice</Link>
          </div>
          <div className="home-arena-card">
            <Trophy size={22} />
            <div>
              <strong>Арена теперь живет внутри Practice</strong>
              <p>Это снижает шум в верхнем уровне навигации и делает coding-сценарии единым потоком.</p>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
};
