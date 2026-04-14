import type { LucideIcon } from 'lucide-react'
import { Code2, Flame, Home, Mic, TrendingUp, Users } from 'lucide-react'

export interface AppNavItem {
  label: string
  shortLabel?: string
  href: string
  matchPrefix?: string
  description: string
  icon: LucideIcon
}

export const PRIMARY_NAV_ITEMS: AppNavItem[] = [
  {
    label: 'Главная',
    shortLabel: 'Home',
    href: '/home',
    description: 'Пульс сообщества, быстрый обзор и свежие события.',
    icon: Home,
  },
  {
    label: 'Community',
    shortLabel: 'People',
    href: '/community',
    matchPrefix: '/community',
    description: 'Люди, события, круги и карта вокруг тебя.',
    icon: Users,
  },
  {
    label: 'Practice',
    shortLabel: 'Code',
    href: '/practice',
    matchPrefix: '/practice',
    description: 'Комнаты, дуэли и тренировки в своём темпе.',
    icon: Code2,
  },
  {
    label: 'Daily',
    shortLabel: 'Daily',
    href: '/daily-challenge',
    description: 'Одна задача на сегодня, чтобы держать темп.',
    icon: Flame,
  },
  {
    label: 'Growth',
    shortLabel: 'Growth',
    href: '/growth',
    matchPrefix: '/growth',
    description: 'Интервью, системная подготовка и рост.',
    icon: TrendingUp,
  },
]

export const SECONDARY_NAV_ITEMS: AppNavItem[] = [
  {
    label: 'Подкасты',
    shortLabel: 'Audio',
    href: '/podcasts',
    description: 'Слушай разборы, опыт и полезные разговоры.',
    icon: Mic,
  },
]

const ROUTE_META = [
  { match: '/home', title: 'Главная', subtitle: 'Пульс сообщества и ближайшие события' },
  { match: '/community', title: 'Community', subtitle: 'Люди, события и локальные круги' },
  { match: '/practice', title: 'Practice', subtitle: 'Комнаты, дуэли и самостоятельная практика' },
  { match: '/daily-challenge', title: 'Daily Challenge', subtitle: 'Короткий ежедневный челлендж' },
  { match: '/growth', title: 'Growth', subtitle: 'Подготовка к интервью и системный рост' },
  { match: '/podcasts', title: 'Подкасты', subtitle: 'Эпизоды, которые можно дослушать позже' },
  { match: '/profile', title: 'Профиль', subtitle: 'Прогресс, достижения и личные настройки' },
  { match: '/admin', title: 'Admin', subtitle: 'Управление платформой и модерация' },
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
