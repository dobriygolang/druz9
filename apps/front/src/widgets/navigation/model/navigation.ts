import type { LucideIcon } from 'lucide-react'
import { BookOpen, Shield, Swords, Tent } from 'lucide-react'

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
    label: 'Camp',
    labelKey: 'nav.home',
    shortLabel: 'Camp',
    href: '/home',
    description: 'Your base camp, quests, and progress.',
    descriptionKey: 'nav.desc.home',
    icon: Tent,
  },
  {
    label: 'Training Grounds',
    labelKey: 'nav.practice',
    shortLabel: 'Train',
    href: '/practice',
    matchPrefix: '/practice',
    description: 'Forge, arena, daily quests, and boss fights.',
    descriptionKey: 'nav.desc.practice',
    icon: Swords,
  },
  {
    label: 'Academy',
    labelKey: 'nav.prepare',
    shortLabel: 'Study',
    href: '/prepare',
    matchPrefix: '/prepare',
    description: 'Trial prep, mock battles, and structured study.',
    descriptionKey: 'nav.desc.prepare',
    icon: BookOpen,
  },
  {
    label: 'Guild',
    labelKey: 'nav.community',
    shortLabel: 'Guild',
    href: '/community',
    matchPrefix: '/community',
    description: 'Companions, council, tavern, and the atlas.',
    descriptionKey: 'nav.desc.community',
    icon: Shield,
  },
]

// No more secondary nav items — Podcasts moved inside Community
export const SECONDARY_NAV_ITEMS: AppNavItem[] = []

const ROUTE_META = [
  { match: '/home', title: 'Camp', titleKey: 'route.home.title', subtitle: 'Your base camp and quest log', subtitleKey: 'route.home.subtitle' },
  { match: '/practice', title: 'Training Grounds', titleKey: 'route.practice.title', subtitle: 'Forge, arena, and challenges', subtitleKey: 'route.practice.subtitle' },
  { match: '/prepare', title: 'Academy', titleKey: 'route.prepare.title', subtitle: 'Trial prep and structured study', subtitleKey: 'route.prepare.subtitle' },
  { match: '/community', title: 'Guild', titleKey: 'route.community.title', subtitle: 'Companions, council, tavern, and atlas', subtitleKey: 'route.community.subtitle' },
  { match: '/profile', title: 'Character Sheet', titleKey: 'route.profile.title', subtitle: 'Stats, achievements, and growth', subtitleKey: 'route.profile.subtitle' },
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
