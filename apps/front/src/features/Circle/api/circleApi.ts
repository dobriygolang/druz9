import {
  ArenaPlayerStats,
} from '@/entities/CodeRoom/model/types';
import {
  Circle,
  CircleLeaderboardEntry,
  CircleMember,
  CircleVisibility,
} from '@/entities/Circle/model/types';
import { CommunityEvent, CommunityMapPoint } from '@/entities/User/model/types';
import { codeRoomApi } from '@/features/CodeRoom/api/codeRoomApi';
import { eventApi } from '@/features/Event/api/eventApi';
import { geoApi } from '@/features/Geo/api/geoApi';
import { getCachedValue, setCachedValue } from '@/shared/api/cache';

type CircleContext = {
  currentUserId?: string;
  currentUserRegion?: string;
  events: CommunityEvent[];
  users: CommunityMapPoint[];
  statsByUserId: Record<string, ArenaPlayerStats>;
  usersById: Map<string, CommunityMapPoint>;
};

type CircleBlueprint = {
  id: string;
  name: string;
  description: string;
  visibility: CircleVisibility;
  focusLabel: string;
  hubLabel: string;
  accentColor: string;
  tags: string[];
  members: CircleMember[];
  recommendedMembers: CircleMember[];
  upcomingEvents: CommunityEvent[];
};

const DEFAULT_STATS: ArenaPlayerStats = {
  userId: '',
  displayName: '',
  rating: 1000,
  league: 'novice',
  wins: 0,
  losses: 0,
  matches: 0,
  winRate: 0,
  bestRuntime: 0,
};

const ACCENT_BY_EVENT_COLOR: Record<CommunityEvent['event_color'], string> = {
  violet: '#8b5cf6',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#fb7185',
  sky: '#38bdf8',
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeStats(user: CommunityMapPoint, statsByUserId: Record<string, ArenaPlayerStats>): ArenaPlayerStats {
  const stats = statsByUserId[user.userId];
  if (!stats) {
    return {
      ...DEFAULT_STATS,
      userId: user.userId,
      displayName: [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.username || user.title,
    };
  }
  return stats;
}

function toCircleMember(user: CommunityMapPoint, statsByUserId: Record<string, ArenaPlayerStats>): CircleMember {
  return {
    ...user,
    arenaStats: normalizeStats(user, statsByUserId),
  };
}

function compareMembers(left: CircleMember, right: CircleMember) {
  if (right.arenaStats.rating !== left.arenaStats.rating) {
    return right.arenaStats.rating - left.arenaStats.rating;
  }
  if (left.activityStatus !== right.activityStatus) {
    if (left.activityStatus === 'online') return 1;
    if (right.activityStatus === 'online') return -1;
  }
  return left.firstName.localeCompare(right.firstName, 'ru');
}

function toLeaderboardEntry(member: CircleMember): CircleLeaderboardEntry {
  return {
    ...member.arenaStats,
    avatarUrl: member.avatarUrl,
    region: member.region,
  };
}

function uniqueMembers(members: CircleMember[]) {
  return Array.from(new Map(members.map((member) => [member.userId, member])).values()).sort(compareMembers);
}

function getUpcomingEvents(events: CommunityEvent[]) {
  const now = Date.now();
  return events
    .filter((event) => {
      const timestamp = new Date(event.scheduled_at).getTime();
      return Number.isFinite(timestamp) && timestamp >= now;
    })
    .sort((left, right) => new Date(left.scheduled_at).getTime() - new Date(right.scheduled_at).getTime());
}

function inferVisibility(groupName: string, events: CommunityEvent[]): CircleVisibility {
  if (/(core|captain|staff|organizer|ops|private|mentor|team|crew|admin|закрыт|ядро)/i.test(groupName)) {
    return 'closed';
  }
  const averageParticipants = events.length > 0
    ? events.reduce((acc, event) => acc + event.participant_count, 0) / events.length
    : 0;
  return averageParticipants <= 5 ? 'closed' : 'open';
}

function resolveHubLabel(events: CommunityEvent[], members: CircleMember[], fallback = 'Distributed') {
  const candidates = [
    ...events.map((event) => event.region).filter(Boolean),
    ...members.map((member) => member.region).filter(Boolean),
  ];
  if (candidates.length === 0) {
    return fallback;
  }
  const counts = candidates.reduce<Map<string, number>>((acc, item) => {
    acc.set(item, (acc.get(item) || 0) + 1);
    return acc;
  }, new Map());
  return Array.from(counts.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] || fallback;
}

function buildRecommendations(
  ctx: CircleContext,
  members: CircleMember[],
  hubLabel: string,
  limit = 4,
) {
  const memberIds = new Set(members.map((member) => member.userId));
  return ctx.users
    .filter((user) => !memberIds.has(user.userId) && (!hubLabel || user.region === hubLabel || user.activityStatus === 'online'))
    .map((user) => toCircleMember(user, ctx.statsByUserId))
    .sort(compareMembers)
    .slice(0, limit);
}

function buildGroupCircle(ctx: CircleContext, groupName: string, groupEvents: CommunityEvent[]): CircleBlueprint | null {
  const memberIds = new Set<string>();
  for (const event of groupEvents) {
    if (event.creator_id) {
      memberIds.add(event.creator_id);
    }
    for (const participant of event.participants) {
      if (participant.user_id) {
        memberIds.add(participant.user_id);
      }
    }
  }

  const members = uniqueMembers(
    Array.from(memberIds)
      .map((userId) => ctx.usersById.get(userId))
      .filter((user): user is CommunityMapPoint => Boolean(user))
      .map((user) => toCircleMember(user, ctx.statsByUserId)),
  );

  const fallbackMembers = members.length > 0
    ? members
    : ctx.users
        .filter((user) => groupEvents.some((event) => event.region && user.region === event.region))
        .map((user) => toCircleMember(user, ctx.statsByUserId))
        .sort(compareMembers)
        .slice(0, 6);

  if (fallbackMembers.length === 0 && groupEvents.length === 0) {
    return null;
  }

  const visibility = inferVisibility(groupName, groupEvents);
  const upcomingEvents = getUpcomingEvents(groupEvents).slice(0, 3);
  const hubLabel = resolveHubLabel(groupEvents, fallbackMembers);
  const eventTypes = Array.from(new Set(groupEvents.map((event) => event.event_type).filter(Boolean))).slice(0, 2);
  const tags = [groupName, ...eventTypes, visibility === 'open' ? 'joinable' : 'invite-only'];

  return {
    id: `group-${slugify(groupName) || 'circle'}`,
    name: groupName,
    description: visibility === 'open'
      ? `Открытый круг вокруг ${groupName.toLowerCase()}: общие ивенты, локальные встречи и быстрый вход через участников.`
      : `Закрытый круг вокруг ${groupName.toLowerCase()}: свой состав, отбор по инвайту и фокусные активности без шума.`,
    visibility,
    focusLabel: eventTypes[0] || 'Shared events',
    hubLabel,
    accentColor: ACCENT_BY_EVENT_COLOR[groupEvents[0]?.event_color ?? 'violet'],
    tags,
    members: fallbackMembers.slice(0, 8),
    recommendedMembers: buildRecommendations(ctx, fallbackMembers, hubLabel, 4),
    upcomingEvents,
  };
}

function buildArenaCore(ctx: CircleContext): CircleBlueprint | null {
  const members = ctx.users
    .map((user) => toCircleMember(user, ctx.statsByUserId))
    .sort(compareMembers)
    .slice(0, 8);

  if (members.length === 0) {
    return null;
  }

  const upcomingEvents = getUpcomingEvents(
    ctx.events.filter((event) => /(arena|duel|code|match|турнир|баттл)/i.test(`${event.title} ${event.description} ${event.event_group} ${event.event_type}`)),
  ).slice(0, 3);

  return {
    id: 'preset-arena-core',
    name: 'Arena Core',
    description: 'Закрытый circle для сильнейших игроков арены: свои матчи, разборы и быстрый скрим-пул.',
    visibility: 'closed',
    focusLabel: 'Arena scrims',
    hubLabel: resolveHubLabel([], members, 'Remote'),
    accentColor: '#f97316',
    tags: ['arena', 'ranked', 'scrims'],
    members,
    recommendedMembers: buildRecommendations(ctx, members, '', 4),
    upcomingEvents,
  };
}

function buildLocalBuilders(ctx: CircleContext): CircleBlueprint | null {
  const targetRegion = ctx.currentUserRegion
    || resolveHubLabel([], ctx.users.map((user) => toCircleMember(user, ctx.statsByUserId)), '');
  const members = ctx.users
    .filter((user) => !targetRegion || user.region === targetRegion)
    .map((user) => toCircleMember(user, ctx.statsByUserId))
    .sort(compareMembers)
    .slice(0, 8);

  if (members.length === 0) {
    return null;
  }

  const upcomingEvents = getUpcomingEvents(
    ctx.events.filter((event) => !targetRegion || event.region === targetRegion),
  ).slice(0, 3);

  return {
    id: `preset-local-${slugify(targetRegion || 'builders')}`,
    name: targetRegion ? `${targetRegion} Builders` : 'Local Builders',
    description: 'Открытый круг по географии: локальные созвоны, прогулки, офлайн-встречи и быстрый вход для новых участников.',
    visibility: 'open',
    focusLabel: 'Local meetups',
    hubLabel: targetRegion || 'Distributed',
    accentColor: '#14b8a6',
    tags: ['local', 'meetup', 'open'],
    members,
    recommendedMembers: buildRecommendations(ctx, members, targetRegion || '', 4),
    upcomingEvents,
  };
}

function toCircle(blueprint: CircleBlueprint, currentUserId?: string): Circle {
  const members = uniqueMembers(blueprint.members);
  const leaderboard = members.slice(0, 5).map(toLeaderboardEntry);
  return {
    id: blueprint.id,
    slug: slugify(blueprint.name) || blueprint.id,
    name: blueprint.name,
    description: blueprint.description,
    visibility: blueprint.visibility,
    focusLabel: blueprint.focusLabel,
    hubLabel: blueprint.hubLabel,
    accentColor: blueprint.accentColor,
    tags: blueprint.tags,
    joined: Boolean(currentUserId && members.some((member) => member.userId === currentUserId)),
    memberCount: members.length,
    onlineCount: members.filter((member) => member.activityStatus === 'online').length,
    eventCount: blueprint.upcomingEvents.length,
    upcomingEvents: blueprint.upcomingEvents,
    leaderboard,
    members,
    recommendedMembers: uniqueMembers(blueprint.recommendedMembers),
  };
}

export const circleApi = {
  list: async (options?: { currentUserId?: string; currentUserRegion?: string }): Promise<Circle[]> => {
    const cacheKey = `circles:list:${options?.currentUserId ?? 'guest'}:${options?.currentUserRegion ?? 'all'}`;
    const cached = getCachedValue<Circle[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const [events, users] = await Promise.all([
      eventApi.list(),
      geoApi.communityMap(),
    ]);

    let statsByUserId: Record<string, ArenaPlayerStats> = {};
    if (users.length > 0) {
      try {
        statsByUserId = await codeRoomApi.getArenaStatsBatch(users.map((user) => user.userId));
      } catch (error) {
        console.error('Failed to load arena stats for circles', error);
      }
    }

    const ctx: CircleContext = {
      currentUserId: options?.currentUserId,
      currentUserRegion: options?.currentUserRegion,
      events,
      users,
      statsByUserId,
      usersById: new Map(users.map((user) => [user.userId, user])),
    };

    const eventsByGroup = events.reduce<Map<string, CommunityEvent[]>>((acc, event) => {
      const group = event.event_group.trim();
      if (!group) {
        return acc;
      }
      const items = acc.get(group) || [];
      items.push(event);
      acc.set(group, items);
      return acc;
    }, new Map());

    const dynamicCircles = Array.from(eventsByGroup.entries())
      .sort((left, right) => right[1].length - left[1].length)
      .map(([groupName, groupEvents]) => buildGroupCircle(ctx, groupName, groupEvents))
      .filter((circle): circle is CircleBlueprint => Boolean(circle))
      .slice(0, 4);

    const presets = [buildArenaCore(ctx), buildLocalBuilders(ctx)].filter((circle): circle is CircleBlueprint => Boolean(circle));

    const circles = [...dynamicCircles, ...presets]
      .filter((circle, index, items) => items.findIndex((item) => item.id === circle.id) === index)
      .map((circle) => toCircle(circle, options?.currentUserId))
      .sort((left, right) => {
        if (left.joined !== right.joined) {
          return left.joined ? -1 : 1;
        }
        if (left.visibility !== right.visibility) {
          return left.visibility === 'open' ? -1 : 1;
        }
        return right.memberCount - left.memberCount;
      });

    setCachedValue(cacheKey, circles, 60_000);
    return circles;
  },
};
