import React, { useEffect, useMemo, useState, useRef } from 'react';
import { User as UserIcon, MapPin, ChevronRight, Search, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { geoApi } from '@/features/Geo/api/geoApi';
import { codeRoomApi } from '@/features/CodeRoom/api/codeRoomApi';
import { matchCommunityUser, useCommunityFilters } from '@/features/Community/model/useCommunityFilters';
import { CommunityMapPoint } from '@/entities/User/model/types';
import { ArenaPlayerStats } from '@/entities/CodeRoom/model/types';
import { useIsMobile } from '@/shared/hooks/useIsMobile';

export const UsersPage: React.FC = () => {
  const isMobile = useIsMobile();
  const [users, setUsers] = useState<CommunityMapPoint[]>([]);
  const [arenaStatsByUserId, setArenaStatsByUserId] = useState<Record<string, ArenaPlayerStats>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { q, region, presence, setQ, setRegion, setPresence, reset } = useCommunityFilters();
  const loadUsersRef = useRef<{ (initial?: boolean): Promise<void> } | null>(null);

  const loadUsers = async (initial = false) => {
    try {
      if (initial) setIsLoading(true);
      const data = await geoApi.communityMap(initial);
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      if (initial) setIsLoading(false);
    }
  };

  loadUsersRef.current = loadUsers;

  useEffect(() => {
    void loadUsers(true);
    const interval = setInterval(() => loadUsersRef.current?.(false), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (users.length === 0) {
      setArenaStatsByUserId({});
      return;
    }

    let cancelled = false;

    const loadArenaStats = async () => {
      // Use batch endpoint to fetch all stats in a single request (O(1) instead of O(n))
      const userIds = users.map(u => u.userId);
      const statsMap = await codeRoomApi.getArenaStatsBatch(userIds);

      if (!cancelled) {
        setArenaStatsByUserId(statsMap);
      }
    };

    void loadArenaStats();

    return () => {
      cancelled = true;
    };
  }, [users]);

  const regionOptions = useMemo(
    () => Array.from(new Set(users.map((user) => user.region).filter(Boolean))).sort((left, right) => left.localeCompare(right, 'ru')),
    [users],
  );

  const filteredUsers = users.filter((user) => matchCommunityUser(user, { q, region, presence }));

  return (
    <div className="fade-in people-page">
      <section className="people-page__hero">
        <div>
          <span className="people-page__eyebrow">People</span>
          <h1>Люди сообщества</h1>
          <p>Список участников сообщества. Найди человека по имени, региону или активности.</p>
        </div>
        <div className="people-page__summary">
          <div className="people-page__summary-card">
            <strong>{isLoading ? '...' : filteredUsers.length}</strong>
            <span>подходит под текущий фильтр</span>
          </div>
          <div className="people-page__summary-card">
            <strong>{isLoading ? '...' : users.filter((item) => item.activityStatus === 'online').length}</strong>
            <span>онлайн прямо сейчас</span>
          </div>
        </div>
      </section>

      <section className="people-filters">
        <label className="people-filters__search">
          <Search size={16} />
          <input
            className="input"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Поиск по имени, Telegram или региону"
          />
        </label>

        <select className="input people-filters__select" value={region} onChange={(event) => setRegion(event.target.value)}>
          <option value="all">Все регионы</option>
          {regionOptions.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>

        <select className="input people-filters__select" value={presence} onChange={(event) => setPresence(event.target.value as 'all' | 'online')}>
          <option value="all">Любая активность</option>
          <option value="online">Только онлайн</option>
        </select>

        <button type="button" className="btn btn-secondary" onClick={reset}>
          Сбросить
        </button>
      </section>

      <div className="people-page__section-head">
        <div>
          <h2>Пользователи</h2>
          <span>{isLoading ? 'Загружаем участников...' : `Всего в выборке: ${filteredUsers.length}`}</span>
        </div>
        {!isLoading && filteredUsers.length > 0 && (
          <div className="people-page__hint">
            <Sparkles size={14} />
            <span>Открывай профиль для деталей</span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="people-page__empty">Загрузка списка пользователей...</div>
      ) : (
        <div className="people-list">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => {
              const profileHandle = user.telegramUsername ? `@${user.telegramUsername}` : 'тг не привязан';

              return (
                <Link
                  key={user.userId}
                  to={`/profile/${user.userId}`}
                  className="people-card"
                >
                <div className="people-card__avatar">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={`${user.firstName} ${user.lastName}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#333' }}>
                      <UserIcon size={24} color="#888" />
                    </div>
                  )}
                </div>
                
                <div className="people-card__body">
                  <div className="people-card__title">
                    {user.firstName} {user.lastName}
                    {user.isCurrentUser && (
                      <span className="people-card__badge">Вы</span>
                    )}
                  </div>
                  <div className="people-card__meta">
                    <span className={`people-card__handle ${user.telegramUsername ? 'is-linked' : ''}`}>{profileHandle}</span>
                    <span className="people-card__region">
                      <MapPin size={12} /> {user.region}
                    </span>
                    <span className="people-card__elo">
                      {arenaStatsByUserId[user.userId]?.rating ?? 1000} ELO
                    </span>
                  </div>
                </div>

                {!isMobile && <ChevronRight size={20} className="people-card__chevron" />}
              </Link>
              );
            })
          ) : (
            <div className="people-page__empty">Никого не найдено</div>
          )}
        </div>
      )}
    </div>
  );
};
