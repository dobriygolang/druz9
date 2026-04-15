import type { LucideIcon } from 'lucide-react'
import { Code2, Home, TrendingUp, Users } from 'lucide-react'

export interface AppNavItem {
  label: string
  labelKey?: string
  shortLabel?: string
  href: string
  matchPrefix?: string
  description: string
  descriptionKey?: string
  icon: LucideIcon
}

export const PRIMARY_NAV_ITEMS: AppNavItem[] = [
  {
    label: 'Home',
    labelKey: 'nav.home',
    shortLabel: 'Home',
    href: '/home',
    description: 'Community pulse, quick overview, and fresh events.',
    descriptionKey: 'nav.desc.home',
    icon: Home,
  },
  {
    label: 'Practice',
    labelKey: 'nav.practice',
    shortLabel: 'Code',
    href: '/practice',
    matchPrefix: '/practice',
    description: 'Rooms, duels, daily challenge, and solo practice.',
    descriptionKey: 'nav.desc.practice',
    icon: Code2,
  },
  {
    label: 'Prepare',
    labelKey: 'nav.prepare',
    shortLabel: 'Prep',
    href: '/prepare',
    matchPrefix: '/prepare',
    description: 'Mock interviews, system design, and structured prep.',
    descriptionKey: 'nav.desc.prepare',
    icon: TrendingUp,
  },
  {
    label: 'Community',
    labelKey: 'nav.community',
    shortLabel: 'People',
    href: '/community',
    matchPrefix: '/community',
    description: 'People, events, circles, podcasts, and the map.',
    descriptionKey: 'nav.desc.community',
    icon: Users,
  },
]

// No more secondary nav items — Podcasts moved inside Community
export const SECONDARY_NAV_ITEMS: AppNavItem[] = []

const ROUTE_META = [
  { match: '/home', title: 'Home', titleKey: 'route.home.title', subtitle: 'Community pulse and upcoming events', subtitleKey: 'route.home.subtitle' },
  { match: '/practice', title: 'Practice', titleKey: 'route.practice.title', subtitle: 'Rooms, duels, and solo training', subtitleKey: 'route.practice.subtitle' },
  { match: '/prepare', title: 'Prepare', titleKey: 'route.prepare.title', subtitle: 'Interview prep and structured growth', subtitleKey: 'route.prepare.subtitle' },
  { match: '/community', title: 'Community', titleKey: 'route.community.title', subtitle: 'People, events, and local circles', subtitleKey: 'route.community.subtitle' },
  { match: '/profile', title: 'Profile', titleKey: 'route.profile.title', subtitle: 'Progress, achievements, and settings', subtitleKey: 'route.profile.subtitle' },
  { match: '/admin', title: 'Admin', titleKey: 'route.admin.title', subtitle: 'Platform management and moderation', subtitleKey: 'route.admin.subtitle' },
]

const FULLSCREEN_PATHS = ['/code-rooms/', '/arena/', '/prepare/interview-prep/mock/', '/growth/interview-prep/mock/']

export function isNavItemActive(pathname: string, item: AppNavItem) {
  if (item.matchPrefix) {
    return pathname.startsWith(item.matchPrefix)
  }
  return pathname === item.href
}

export function getMobileRouteMeta(pathname: string) {
  return ROUTE_META.find((item) => pathname.startsWith(item.match)) ?? ROUTE_META[0]
}

export function isFullscreenPath(pathname: string) {
  return FULLSCREEN_PATHS.some((path) => pathname.startsWith(path))
}
