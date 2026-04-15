import type { LucideIcon } from 'lucide-react'
import { Code2, Flame, Home, Mic, Rocket, TrendingUp, Users } from 'lucide-react'

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
    label: 'Journey',
    labelKey: 'nav.journey',
    shortLabel: 'Journey',
    href: '/journey',
    description: 'Your progress and path to the offer.',
    descriptionKey: 'nav.desc.journey',
    icon: Rocket,
  },
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
    label: 'Community',
    labelKey: 'nav.community',
    shortLabel: 'People',
    href: '/community',
    matchPrefix: '/community',
    description: 'People, events, circles, and the map around you.',
    descriptionKey: 'nav.desc.community',
    icon: Users,
  },
  {
    label: 'Practice',
    labelKey: 'nav.practice',
    shortLabel: 'Code',
    href: '/practice',
    matchPrefix: '/practice',
    description: 'Rooms, duels, and practice at your own pace.',
    descriptionKey: 'nav.desc.practice',
    icon: Code2,
  },
  {
    label: 'Daily',
    labelKey: 'nav.daily',
    shortLabel: 'Daily',
    href: '/daily-challenge',
    description: 'One task for today to keep the rhythm.',
    descriptionKey: 'nav.desc.daily',
    icon: Flame,
  },
  {
    label: 'Growth',
    labelKey: 'nav.growth',
    shortLabel: 'Growth',
    href: '/growth',
    matchPrefix: '/growth',
    description: 'Interviews, system design prep, and growth.',
    descriptionKey: 'nav.desc.growth',
    icon: TrendingUp,
  },
]

export const SECONDARY_NAV_ITEMS: AppNavItem[] = [
  {
    label: 'Podcasts',
    labelKey: 'nav.podcasts',
    shortLabel: 'Audio',
    href: '/podcasts',
    description: 'Listen to deep dives, experience, and useful conversations.',
    descriptionKey: 'nav.desc.podcasts',
    icon: Mic,
  },
]

const ROUTE_META = [
  { match: '/journey', title: 'Journey', titleKey: 'route.journey.title', subtitle: 'Readiness score and the next step', subtitleKey: 'route.journey.subtitle' },
  { match: '/home', title: 'Home', titleKey: 'route.home.title', subtitle: 'Community pulse and upcoming events', subtitleKey: 'route.home.subtitle' },
  { match: '/community', title: 'Community', titleKey: 'route.community.title', subtitle: 'People, events, and local circles', subtitleKey: 'route.community.subtitle' },
  { match: '/practice', title: 'Practice', titleKey: 'route.practice.title', subtitle: 'Rooms, duels, and solo practice', subtitleKey: 'route.practice.subtitle' },
  { match: '/daily-challenge', title: 'Daily Challenge', titleKey: 'route.daily.title', subtitle: 'A short daily challenge', subtitleKey: 'route.daily.subtitle' },
  { match: '/growth', title: 'Growth', titleKey: 'route.growth.title', subtitle: 'Interview prep and systematic growth', subtitleKey: 'route.growth.subtitle' },
  { match: '/podcasts', title: 'Podcasts', titleKey: 'route.podcasts.title', subtitle: 'Episodes you can come back to later', subtitleKey: 'route.podcasts.subtitle' },
  { match: '/profile', title: 'Profile', titleKey: 'route.profile.title', subtitle: 'Progress, achievements, and personal settings', subtitleKey: 'route.profile.subtitle' },
  { match: '/admin', title: 'Admin', titleKey: 'route.admin.title', subtitle: 'Platform management and moderation', subtitleKey: 'route.admin.subtitle' },
]

const FULLSCREEN_PATHS = ['/code-rooms/', '/arena/', '/growth/interview-prep/mock/']

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
