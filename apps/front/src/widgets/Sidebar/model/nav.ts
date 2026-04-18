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
}

export interface NavGroup {
  labelKey: string
  items: NavItem[]
}

// Every icon value is unique in this list — no repeats. If you add a new
// item, pick a distinct NavIconKind or add one in shared/ui/sprites.
export const NAV_GROUPS: NavGroup[] = [
  {
    labelKey: 'sidebar.group.questLog',
    items: [
      { id: 'hub', labelKey: 'sidebar.nav.hub', hintKey: 'sidebar.hint.hub', icon: 'hub', path: '/hub' },
      { id: 'profile', labelKey: 'sidebar.nav.profile', hintKey: 'sidebar.hint.profile', icon: 'profile', path: '/profile' },
      { id: 'guild', labelKey: 'sidebar.nav.guild', hintKey: 'sidebar.hint.guild', icon: 'guild', path: '/guild' },
      {
        id: 'arena',
        labelKey: 'sidebar.nav.arena',
        hintKey: 'sidebar.hint.arena',
        icon: 'arena',
        path: '/arena',
        badgeKey: 'arenaOpen',
      },
    ],
  },
  {
    labelKey: 'sidebar.group.practice',
    items: [
      { id: 'training', labelKey: 'sidebar.nav.training', hintKey: 'sidebar.hint.training', icon: 'training', path: '/training' },
      { id: 'skills', labelKey: 'sidebar.nav.skills', hintKey: 'sidebar.hint.skills', icon: 'skills', path: '/skills' },
      { id: 'coderooms', labelKey: 'sidebar.nav.coderooms', hintKey: 'sidebar.hint.coderooms', icon: 'coderoom', path: '/practice/code-rooms' },
      { id: 'interview', labelKey: 'sidebar.nav.interview', hintKey: 'sidebar.hint.interview', icon: 'interview', path: '/interview' },
      { id: 'leaderboards', labelKey: 'sidebar.nav.leaderboards', hintKey: 'sidebar.hint.leaderboards', icon: 'leaderboard', path: '/leaderboards' },
      {
        // The friends list lives as a tab inside /inbox — one place for
        // all your social activity (chats + contacts).
        id: 'inbox',
        labelKey: 'sidebar.nav.inbox',
        hintKey: 'sidebar.hint.inbox',
        icon: 'inbox',
        path: '/inbox',
        badgeKey: 'inboxUnread',
      },
      {
        id: 'challenges',
        labelKey: 'sidebar.nav.challenges',
        hintKey: 'sidebar.hint.challenges',
        icon: 'challenges',
        path: '/challenges',
        badgeKey: 'incomingChallenges',
      },
    ],
  },
  {
    labelKey: 'sidebar.group.world',
    items: [
      {
        id: 'events',
        labelKey: 'sidebar.nav.events',
        hintKey: 'sidebar.hint.events',
        icon: 'events',
        path: '/events',
        badge: { kind: 'ember', textKey: 'sidebar.badge.new' },
      },
      { id: 'podcasts', labelKey: 'sidebar.nav.podcasts', hintKey: 'sidebar.hint.podcasts', icon: 'podcasts', path: '/podcasts' },
      { id: 'map', labelKey: 'sidebar.nav.map', hintKey: 'sidebar.hint.map', icon: 'map', path: '/map' },
      { id: 'tavern', labelKey: 'sidebar.nav.tavern', hintKey: 'sidebar.hint.tavern', icon: 'shop', path: '/tavern' },
      { id: 'seasonpass', labelKey: 'sidebar.nav.seasonpass', hintKey: 'sidebar.hint.seasonpass', icon: 'seasonpass', path: '/seasonpass' },
      { id: 'war', labelKey: 'sidebar.nav.war', hintKey: 'sidebar.hint.war', icon: 'war', path: '/war' },
    ],
  },
  {
    labelKey: 'sidebar.group.system',
    items: [
      { id: 'settings', labelKey: 'sidebar.nav.settings', hintKey: 'sidebar.hint.settings', icon: 'settings', path: '/settings' },
    ],
  },
]
