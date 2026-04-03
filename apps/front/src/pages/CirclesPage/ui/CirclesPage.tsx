import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, CircleDot, Lock, Sparkles, Trophy, Users, MapPin, ArrowUpRight } from 'lucide-react';

import { useAuth } from '@/app/providers/AuthProvider';
import { Circle } from '@/entities/Circle/model/types';
import { matchCircle, useCommunityFilters } from '@/features/Community/model/useCommunityFilters';
import { circleApi } from '@/features/Circle/api/circleApi';
import { useIsMobile } from '@/shared/hooks/useIsMobile';

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function visibilityLabel(value: Circle['visibility']) {
  return value === 'open' ? 'Открытый' : 'Закрытый';
}

function participantLabel(count: number) {
  if (count % 10 === 1 && count % 100 !== 11) return 'участник';
  if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14)) return 'участника';
  return 'участников';
}

export const CirclesPage: React.FC = () => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { q, region, visibility, setVisibility } = useCommunityFilters();

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setIsLoading(true);
        setError('');
        const data = await circleApi.list({
          currentUserId: user?.id,
          currentUserRegion: user?.region,
        });
        if (!cancelled) {
          setCircles(data);
        }
      } catch (loadError) {
        console.error(loadError);
        if (!cancelled) {
          setError('Не удалось собрать circles из текущих данных.');
        }
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

  const filteredCircles = useMemo(
    () => circles.filter((circle) => matchCircle(circle, { q, region, visibility })),
    [circles, q, region, visibility],
  );

  const metrics = useMemo(() => {
    return {
      total: circles.length,
      open: circles.filter((circle) => circle.visibility === 'open').length,
      closed: circles.filter((circle) => circle.visibility === 'closed').length,
      events: circles.reduce((acc, circle) => acc + circle.upcomingEvents.length, 0),
    };
  }, [circles]);

  return (
    <div className="fade-in circles-page">
      <section className="circles-hero">
        <div className="circles-hero__copy">
          <span className="circles-hero__kicker">Circles</span>
          <h1>Мини-комьюнити</h1>
          <p>
            Небольшие круги по интересу, региону или соревновательному режиму. У каждого свой состав, события и локальный рейтинг.
          </p>
        </div>

        <div className="circles-hero__stats">
          <div className="circles-metric">
            <span>Всего circles</span>
            <strong>{metrics.total}</strong>
          </div>
          <div className="circles-metric">
            <span>Открытые</span>
            <strong>{metrics.open}</strong>
          </div>
          <div className="circles-metric">
            <span>Закрытые</span>
            <strong>{metrics.closed}</strong>
          </div>
          <div className="circles-metric">
            <span>Ближайшие ивенты</span>
            <strong>{metrics.events}</strong>
          </div>
        </div>
      </section>

      <section className="circles-toolbar">
        {(['all', 'open', 'closed'] as const).map((value) => (
          <button
            key={value}
            type="button"
            className={`circles-filter ${visibility === value ? 'is-active' : ''}`}
            onClick={() => setVisibility(value)}
          >
            {value === 'all' ? 'Все' : value === 'open' ? 'Открытые' : 'Закрытые'}
          </button>
        ))}
      </section>

      {isLoading ? (
        <div className="circles-grid">
          {[1, 2, 3].map((item) => (
            <div key={item} className="circles-card circles-card--skeleton" />
          ))}
        </div>
      ) : error ? (
        <div className="card circles-empty-state">{error}</div>
      ) : filteredCircles.length === 0 ? (
        <div className="card circles-empty-state">Под выбранный фильтр circles пока не собрались.</div>
      ) : (
        <div className="circles-grid">
          {filteredCircles.map((circle) => (
            <article
              key={circle.id}
              className="circles-card"
              style={{ ['--circle-accent' as string]: circle.accentColor }}
            >
              <div className="circles-card__header">
                <div>
                  <div className="circles-card__badges">
                    <span className={`circles-badge circles-badge--${circle.visibility}`}>
                      {circle.visibility === 'open' ? <CircleDot size={14} /> : <Lock size={14} />}
                      {visibilityLabel(circle.visibility)}
                    </span>
                    {circle.joined && <span className="circles-badge circles-badge--joined">Ваш круг</span>}
                  </div>
                  <h2>{circle.name}</h2>
                </div>

                <div className="circles-card__meta">
                  <span>{circle.focusLabel}</span>
                  <span>{circle.hubLabel}</span>
                </div>
              </div>

              <p className="circles-card__description">{circle.description}</p>

              <div className="circles-card__stats">
                <div>
                  <Users size={16} />
                  <span>{circle.memberCount} {participantLabel(circle.memberCount)}</span>
                </div>
                <div>
                  <Sparkles size={16} />
                  <span>{circle.onlineCount} онлайн</span>
                </div>
                <div>
                  <CalendarDays size={16} />
                  <span>{circle.upcomingEvents.length} ивента</span>
                </div>
                <div>
                  <Trophy size={16} />
                  <span>{circle.leaderboard[0]?.rating ?? 1000} top ELO</span>
                </div>
              </div>

              <div className="circles-card__section">
                <div className="circles-card__section-head">
                  <span>Ближайшие события</span>
                  <Link to="/community/events">Все ивенты</Link>
                </div>
                {circle.upcomingEvents.length > 0 ? (
                  <div className="circles-event-list">
                    {circle.upcomingEvents.slice(0, 2).map((event) => (
                      <div key={event.id} className="circles-event-item">
                        <div>
                          <strong>{event.title}</strong>
                          <span>{formatEventDate(event.scheduled_at)}</span>
                        </div>
                        <div className="circles-event-item__meta">
                          <MapPin size={14} />
                          <span>{event.region || event.place_label || 'Online'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="circles-muted">Пока без ближайших событий.</div>
                )}
              </div>

              <div className="circles-card__section">
                <div className="circles-card__section-head">
                  <span>Мини-лидерборд</span>
                  <Link to="/community/people">Сообщество</Link>
                </div>
                <div className="circles-leaderboard">
                  {circle.leaderboard.slice(0, 3).map((entry, index) => (
                    <div key={entry.userId} className="circles-leaderboard__row">
                      <span className="circles-rank">#{index + 1}</span>
                      <div className="circles-userline">
                        <strong>{entry.displayName}</strong>
                        <span>{entry.region}</span>
                      </div>
                      <span className="circles-rating">{entry.rating} ELO</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="circles-card__section">
                <div className="circles-card__section-head">
                  <span>Подборка участников</span>
                  <Link to="/community/people">Открыть список</Link>
                </div>
                <div className="circles-member-list">
                  {circle.members.slice(0, isMobile ? 4 : 5).map((member) => (
                    <Link key={member.userId} to={`/profile/${member.userId}`} className="circles-member-card">
                      <div className="circles-avatar">
                        {member.avatarUrl ? (
                          <img src={member.avatarUrl} alt={member.firstName} />
                        ) : (
                          <span>{member.firstName?.[0] || member.username?.[0] || '?'}</span>
                        )}
                      </div>
                      <div className="circles-userline">
                        <strong>{[member.firstName, member.lastName].filter(Boolean).join(' ') || member.username}</strong>
                        <span>{member.region}</span>
                      </div>
                      <span className="circles-rating">{member.arenaStats.rating}</span>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="circles-card__footer">
                <div className="circles-tags">
                  {circle.tags.slice(0, 4).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <div className="circles-card__cta">
                  <span>{circle.visibility === 'open' ? 'Можно зайти через участников' : 'Вход по инвайту'}</span>
                  <ArrowUpRight size={16} />
                </div>
              </div>

              {circle.recommendedMembers.length > 0 && (
                <div className="circles-card__aside">
                  <span>Кого позвать</span>
                  <div className="circles-recommendations">
                    {circle.recommendedMembers.slice(0, 3).map((member) => (
                      <Link key={member.userId} to={`/profile/${member.userId}`}>
                        {[member.firstName, member.lastName].filter(Boolean).join(' ') || member.username}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
