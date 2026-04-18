import type { NavIconKind } from '@/shared/ui/sprites'

export interface NavItem {
  id: string
  labelKey: string
  hintKey: string
  icon: NavIconKind
  path: string
  // Static fallback badge (e.g. "new"). Dynamic counters live on
  // `badgeKey` — the sidebar shell resolves them against an API store.
  badge?: { kind: 'ember' | 'dark'; textKey: string }
  badgeKey?: 'inboxUnread' | 'incomingChallenges' | 'arenaOpen'
  // Hidden unless the viewer has `user.isAdmin`. Sidebar filters these
  // out for regular users so no shimmering admin links leak through.
  adminOnly?: boolean
}

export interface NavGroup {
  labelKey: string
  items: NavItem[]
}

// Every icon value is unique in this list — no repeats. If you add a new
// item, pick a distinct NavIconKind or add one in shared/ui/sprites.
export const NAV_GROUPS: NavGroup[] = [
  {
    // Home — personal hub and profile are the user's "base".
    labelKey: 'sidebar.group.home',
    items: [
      { id: 'hub',     labelKey: 'sidebar.nav.hub',     hintKey: 'sidebar.hint.hub',     icon: 'hub',     path: '/hub' },
      { id: 'profile', labelKey: 'sidebar.nav.profile', hintKey: 'sidebar.hint.profile', icon: 'profile', path: '/profile' },
    ],
  },
  {
    // Practice — solo and guided learning: skill tree, interviews, coding.
    labelKey: 'sidebar.group.practice',
    items: [
      { id: 'atlas',     labelKey: 'sidebar.nav.atlas',     hintKey: 'sidebar.hint.atlas',     icon: 'skills',    path: '/atlas' },
      { id: 'interview', labelKey: 'sidebar.nav.interview', hintKey: 'sidebar.hint.interview', icon: 'interview', path: '/interview' },
      { id: 'coderooms', labelKey: 'sidebar.nav.coderooms', hintKey: 'sidebar.hint.coderooms', icon: 'coderoom',  path: '/practice/code-rooms' },
    ],
  },
  {
    // Games & Rankings — competitive features: arena duels, guild war, boards.
    labelKey: 'sidebar.group.games',
    items: [
      {
        id: 'arena',
        labelKey: 'sidebar.nav.arena',
        hintKey:  'sidebar.hint.arena',
        icon:     'arena',
        path:     '/arena',
        badgeKey: 'arenaOpen',
      },
      { id: 'war',          labelKey: 'sidebar.nav.war',          hintKey: 'sidebar.hint.war',          icon: 'war',         path: '/war' },
      { id: 'leaderboards', labelKey: 'sidebar.nav.leaderboards', hintKey: 'sidebar.hint.leaderboards', icon: 'leaderboard', path: '/leaderboards' },
    ],
  },
  {
    // Guild — collective space, hall, and war management.
    labelKey: 'sidebar.group.guild',
    items: [
      { id: 'guild', labelKey: 'sidebar.nav.guild', hintKey: 'sidebar.hint.guild', icon: 'guild', path: '/guild' },
    ],
  },
  {
    // Community — social inbox, live events, world map, podcasts.
    labelKey: 'sidebar.group.community',
    items: [
      {
        id: 'inbox',
        labelKey: 'sidebar.nav.inbox',
        hintKey:  'sidebar.hint.inbox',
        icon:     'inbox',
        path:     '/inbox',
        badgeKey: 'inboxUnread',
      },
      {
        id: 'events',
        labelKey: 'sidebar.nav.events',
        hintKey:  'sidebar.hint.events',
        icon:     'events',
        path:     '/events',
        badge:    { kind: 'ember', textKey: 'sidebar.badge.new' },
      },
      { id: 'map',      labelKey: 'sidebar.nav.map',      hintKey: 'sidebar.hint.map',      icon: 'map',      path: '/map' },
      { id: 'podcasts', labelKey: 'sidebar.nav.podcasts', hintKey: 'sidebar.hint.podcasts', icon: 'podcasts', path: '/podcasts' },
    ],
  },
  {
    // Shop — tavern items, season pass rewards.
    labelKey: 'sidebar.group.shop',
    items: [
      { id: 'tavern',     labelKey: 'sidebar.nav.tavern',     hintKey: 'sidebar.hint.tavern',     icon: 'shop',       path: '/tavern' },
      { id: 'seasonpass', labelKey: 'sidebar.nav.seasonpass', hintKey: 'sidebar.hint.seasonpass', icon: 'seasonpass', path: '/seasonpass' },
    ],
  },
  {
    // System — settings and admin panel.
    labelKey: 'sidebar.group.system',
    items: [
      { id: 'settings', labelKey: 'sidebar.nav.settings', hintKey: 'sidebar.hint.settings', icon: 'settings', path: '/settings' },
      {
        id:        'admin',
        labelKey:  'sidebar.nav.admin',
        hintKey:   'sidebar.hint.admin',
        icon:      'settings',
        path:      '/admin',
        adminOnly: true,
        badge:     { kind: 'ember', textKey: 'sidebar.badge.admin' },
      },
    ],
  },
]
