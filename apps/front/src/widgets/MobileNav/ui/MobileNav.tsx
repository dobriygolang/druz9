import { Link, useLocation } from 'react-router-dom'
import { Home, Users, Code2, TrendingUp, Flame } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

const NAV_ITEMS = [
  { label: 'Главная',   icon: Home,        href: '/home' },
  { label: 'Community', icon: Users,       href: '/community', matchPrefix: '/community' },
  { label: 'Practice',  icon: Code2,       href: '/practice',  matchPrefix: '/practice' },
  { label: 'Daily',     icon: Flame,       href: '/daily-challenge' },
  { label: 'Growth',    icon: TrendingUp,  href: '/growth',    matchPrefix: '/growth' },
]

export function MobileNav() {
  const location = useLocation()

  const isActive = (item: typeof NAV_ITEMS[number]) => {
    if (item.matchPrefix) return location.pathname.startsWith(item.matchPrefix)
    return location.pathname === item.href
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-stretch md:hidden bg-[#E7E8E5] border-t border-[#CBCCC9] dark:bg-[#0b0d16] dark:border-[#1a2540]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {NAV_ITEMS.map((item) => {
        const active = isActive(item)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors',
              active ? 'text-[#6366F1] dark:text-[#818cf8]' : 'text-[#94a3b8] dark:text-[#3d5570]'
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[9px] font-medium leading-none">{item.label}</span>
            {active && (
              <span className="absolute top-0 inset-x-0 h-[2px] bg-[#6366F1] dark:bg-[#818cf8] rounded-b-full" />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
