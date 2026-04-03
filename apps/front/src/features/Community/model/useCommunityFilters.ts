import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { CommunityEvent, CommunityMapPoint } from '@/entities/User/model/types';
import { Circle } from '@/entities/Circle/model/types';

export type CommunityPresenceFilter = 'all' | 'online';
export type CommunityVisibilityFilter = 'all' | 'open' | 'closed';

function lower(value: string) {
  return value.trim().toLowerCase();
}

export function useCommunityFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(
    () => ({
      q: searchParams.get('q') ?? '',
      region: searchParams.get('region') ?? 'all',
      presence: (searchParams.get('presence') as CommunityPresenceFilter) || 'all',
      visibility: (searchParams.get('visibility') as CommunityVisibilityFilter) || 'all',
    }),
    [searchParams],
  );

  const updateFilter = (key: 'q' | 'region' | 'presence' | 'visibility', value: string) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'all') {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next, { replace: true });
  };

  return {
    ...filters,
    setQ: (value: string) => updateFilter('q', value),
    setRegion: (value: string) => updateFilter('region', value),
    setPresence: (value: CommunityPresenceFilter) => updateFilter('presence', value),
    setVisibility: (value: CommunityVisibilityFilter) => updateFilter('visibility', value),
    reset: () => setSearchParams(new URLSearchParams(), { replace: true }),
  };
}

export function matchCommunityUser(
  user: CommunityMapPoint,
  filters: { q: string; region: string; presence: CommunityPresenceFilter },
) {
  if (filters.region !== 'all' && user.region !== filters.region) {
    return false;
  }
  if (filters.presence === 'online' && user.activityStatus !== 'online') {
    return false;
  }
  if (!filters.q.trim()) {
    return true;
  }
  const haystack = [
    user.firstName,
    user.lastName,
    user.username,
    user.telegramUsername ?? '',
    user.title,
    user.region,
  ].join(' ').toLowerCase();
  return haystack.includes(lower(filters.q));
}

export function matchCommunityEvent(
  event: CommunityEvent,
  filters: { q: string; region: string },
) {
  if (filters.region !== 'all' && event.region !== filters.region) {
    return false;
  }
  if (!filters.q.trim()) {
    return true;
  }
  const haystack = [
    event.title,
    event.description,
    event.place_label,
    event.region,
    event.event_group,
    event.event_type,
  ].join(' ').toLowerCase();
  return haystack.includes(lower(filters.q));
}

export function matchCircle(
  circle: Circle,
  filters: { q: string; region: string; visibility: CommunityVisibilityFilter },
) {
  if (filters.visibility !== 'all' && circle.visibility !== filters.visibility) {
    return false;
  }
  if (filters.region !== 'all') {
    const hasRegion = circle.hubLabel === filters.region || circle.members.some((member) => member.region === filters.region);
    if (!hasRegion) {
      return false;
    }
  }
  if (!filters.q.trim()) {
    return true;
  }
  const haystack = [
    circle.name,
    circle.description,
    circle.focusLabel,
    circle.hubLabel,
    circle.tags.join(' '),
  ].join(' ').toLowerCase();
  return haystack.includes(lower(filters.q));
}
