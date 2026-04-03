import React, { useEffect, useMemo, useState } from 'react';

import { Circle } from '@/entities/Circle/model/types';
import { CommunityMapPoint } from '@/entities/User/model/types';
import { circleApi } from '@/features/Circle/api/circleApi';
import { geoApi } from '@/features/Geo/api/geoApi';
import { useCommunityFilters } from '@/features/Community/model/useCommunityFilters';

export const CommunityFiltersBar: React.FC = () => {
  const { q, region, presence, visibility, setQ, setRegion, setPresence, setVisibility, reset } = useCommunityFilters();
  const [users, setUsers] = useState<CommunityMapPoint[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      geoApi.communityMap().catch(() => []),
      circleApi.list().catch(() => []),
    ]).then(([nextUsers, nextCircles]) => {
      if (!cancelled) {
        setUsers(nextUsers);
        setCircles(nextCircles);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const regionOptions = useMemo(
    () => Array.from(new Set([
      ...users.map((user) => user.region).filter(Boolean),
      ...circles.map((circle) => circle.hubLabel).filter(Boolean),
    ])).sort((left, right) => left.localeCompare(right, 'ru')),
    [circles, users],
  );

  return (
    <div className="community-filters">
      <input
        className="input community-filters__search"
        value={q}
        onChange={(event) => setQ(event.target.value)}
        placeholder="Поиск по людям, событиям и circles..."
      />

      <select className="input community-filters__select" value={region} onChange={(event) => setRegion(event.target.value)}>
        <option value="all">Все регионы</option>
        {regionOptions.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>

      <select className="input community-filters__select" value={presence} onChange={(event) => setPresence(event.target.value as 'all' | 'online')}>
        <option value="all">Любая активность</option>
        <option value="online">Только онлайн</option>
      </select>

      <select className="input community-filters__select" value={visibility} onChange={(event) => setVisibility(event.target.value as 'all' | 'open' | 'closed')}>
        <option value="all">Все circles</option>
        <option value="open">Только open</option>
        <option value="closed">Только closed</option>
      </select>

      <button type="button" className="btn btn-secondary" onClick={reset}>
        Сбросить
      </button>
    </div>
  );
};
