import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, Search, X } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { geoApi } from '@/features/Geo/api/geoApi';
import { codeRoomApi } from '@/features/CodeRoom/api/codeRoomApi';
import { matchCommunityUser, useCommunityFilters } from '@/features/Community/model/useCommunityFilters';
import { CommunityMapPoint } from '@/entities/User/model/types';
import { ArenaPlayerStats } from '@/entities/CodeRoom/model/types';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<CommunityMapPoint[]>([]);
  const [arenaStatsByUserId, setArenaStatsByUserId] = useState<Record<string, ArenaPlayerStats>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { q, region, presence, setQ } = useCommunityFilters();
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
  const onlineCount = users.filter((item) => item.activityStatus === 'online').length;

  const summaryText = useMemo(() => {
    const regionCount = regionOptions.length;
    return `${users.length} участников · ${onlineCount} онлайн · ${regionCount} ${regionCount === 1 ? 'регион' : regionCount >= 2 && regionCount <= 4 ? 'региона' : 'регионов'}`;
  }, [onlineCount, regionOptions.length, users.length]);

  const rows = filteredUsers.slice(0, 5);

  return (
    <div className="community-people fade-in">
      <section className="community-people__header">
        <div className="community-people__top-row">
          <div className="community-people__title-block">
            <h1>Community</h1>
            <p>{isLoading ? 'Загружаем сообщество...' : summaryText}</p>
          </div>

          <label className="community-people__search">
            <Search size={16} />
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search..."
              aria-label="Search people"
            />
            <span className="community-people__search-clear" aria-hidden="true">
              {q ? <X size={16} /> : null}
            </span>
          </label>
        </div>

        <nav className="community-people__tabs" aria-label="Community sections">
          <NavLink to="/community/people" end className={({ isActive }) => `community-people__tab${isActive ? ' is-active' : ''}`}>People</NavLink>
          <NavLink to="/community/events" className={({ isActive }) => `community-people__tab${isActive ? ' is-active' : ''}`}>Events</NavLink>
          <NavLink to="/community/map" className={({ isActive }) => `community-people__tab${isActive ? ' is-active' : ''}`}>Map</NavLink>
          <NavLink to="/community/circles" className={({ isActive }) => `community-people__tab${isActive ? ' is-active' : ''}`}>Circles</NavLink>
        </nav>
      </section>

      <section className="community-people__list">
        {isLoading ? (
          <div className="community-people__empty">Загрузка списка пользователей...</div>
        ) : rows.length > 0 ? (
          rows.map((user) => {
            const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username;
            const initials = `${user.firstName?.charAt(0) ?? ''}${user.lastName?.charAt(0) ?? ''}`.trim().toUpperCase() || user.username.slice(0, 2).toUpperCase();
            const handle = user.telegramUsername ? `@${user.telegramUsername}` : '@unknown';
            const rating = arenaStatsByUserId[user.userId]?.rating ?? 1000;

            return (
              <Link key={user.userId} to={`/profile/${user.userId}`} className="community-people__row">
                <div className="community-people__avatar" aria-hidden="true">{initials}</div>
                <div className="community-people__info">
                  <div className="community-people__name-row">
                    <strong>{fullName}</strong>
                    {user.activityStatus === 'online' && <span className="community-people__badge">online</span>}
                  </div>
                  <div className="community-people__meta-row">
                    <span className="community-people__handle">{handle}</span>
                    <span>{user.region || 'Online'}</span>
                    <span>{rating} ELO</span>
                  </div>
                </div>
                <ChevronRight size={16} className="community-people__chevron" />
              </Link>
            );
          })
        ) : (
          <div className="community-people__empty">Никого не найдено</div>
        )}
      </section>
    </div>
  );
};
