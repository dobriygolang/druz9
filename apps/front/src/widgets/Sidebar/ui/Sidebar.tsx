import { Link, useLocation } from 'react-router-dom'
import { Home, Users, Code2, TrendingUp, Mic, Swords, LogOut } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { useAuth } from '@/app/providers/AuthProvider'
import { Avatar } from '@/shared/ui/Avatar'

interface NavItem {
  label: string
  icon: React.ReactNode
  href: string
  matchPrefix?: string
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Главная', icon: <Home className="w-4 h-4" />, href: '/home' },
  { label: 'Community', icon: <Users className="w-4 h-4" />, href: '/community', matchPrefix: '/community' },
  { label: 'Practice', icon: <Code2 className="w-4 h-4" />, href: '/practice', matchPrefix: '/practice' },
  { label: 'Growth', icon: <TrendingUp className="w-4 h-4" />, href: '/growth', matchPrefix: '/growth' },
  { label: 'Подкасты', icon: <Mic className="w-4 h-4" />, href: '/podcasts' },
  { label: 'Arena', icon: <Swords className="w-4 h-4" />, href: '/practice/arena' },
]

export function Sidebar() {
  const location = useLocation()
  const { user, logout } = useAuth()

  const isActive = (item: NavItem) => {
    if (item.matchPrefix) return location.pathname.startsWith(item.matchPrefix)
    return location.pathname === item.href
  }

  const displayName = user ? `${user.firstName} ${user.lastName}`.trim() || user.username : ''
  const email = user?.telegramUsername ? `@${user.telegramUsername}` : ''

  return (
    <aside className="w-[280px] min-h-screen bg-[#E7E8E5] border-r border-[#CBCCC9] flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="h-[88px] flex items-center px-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#FF8400] rounded-lg flex items-center justify-center transition-transform duration-200 hover:scale-110">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M3 15L9 3L15 15" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5.5 11H12.5" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="font-mono font-bold text-lg text-[#FF8400] tracking-wider">ДРУЗЬЯ</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item)
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-full text-sm font-medium transition-all duration-200 font-geist',
                active
                  ? 'bg-[#CBCCC9] text-[#111111]'
                  : 'text-[#666666] hover:bg-[#D8D9D6] hover:text-[#111111]',
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      {user && (
        <div className="px-6 py-5 border-t border-[#CBCCC9]">
          <div className="flex items-center gap-3">
            <Avatar
              name={displayName}
              src={user.avatarUrl || undefined}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#111111] font-geist truncate">{displayName}</p>
              {email && <p className="text-xs text-[#666666] font-geist truncate">{email}</p>}
            </div>
            <button
              onClick={() => logout()}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#CBCCC9] transition-colors text-[#94a3b8]"
              title="Выйти"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}
