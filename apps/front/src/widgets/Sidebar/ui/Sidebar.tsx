import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Home, Users, Code2, TrendingUp, Mic, Swords, Briefcase, User, Settings, LogOut } from 'lucide-react'
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
  { label: 'Вакансии', icon: <Briefcase className="w-4 h-4" />, href: '/vacancies' },
]

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [popoverOpen, setPopoverOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Close popover on outside click
  useEffect(() => {
    if (!popoverOpen) return
    const handleMouseDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverOpen(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [popoverOpen])

  // Close popover on Escape
  useEffect(() => {
    if (!popoverOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPopoverOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [popoverOpen])

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

      {/* Footer with popover menu */}
      {user && (
        <div className="relative px-6 py-5 border-t border-[#CBCCC9]" ref={popoverRef}>
          {/* Popover */}
          {popoverOpen && (
            <div className="absolute bottom-full left-4 right-4 mb-2 bg-white rounded-xl shadow-lg border border-[#CBCCC9] z-50 overflow-hidden">
              {/* User info */}
              <div className="px-4 py-3 flex items-center gap-3">
                <Avatar
                  name={displayName}
                  src={user.avatarUrl || undefined}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#111111] font-geist truncate">{displayName}</p>
                  {email && <p className="text-xs text-[#666666] font-geist truncate">{email}</p>}
                </div>
              </div>

              <div className="h-px bg-[#CBCCC9]" />

              {/* Menu items */}
              <div className="py-1">
                <button
                  onClick={() => { setPopoverOpen(false); navigate('/profile') }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#111111] hover:bg-[#F2F3F0] transition-colors font-geist"
                >
                  <User className="w-4 h-4 text-[#666666]" />
                  Мой профиль
                </button>
                <button
                  disabled
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#666666] opacity-50 cursor-not-allowed font-geist"
                >
                  <Settings className="w-4 h-4" />
                  Настройки
                </button>
              </div>

              <div className="h-px bg-[#CBCCC9]" />

              <div className="py-1">
                <button
                  onClick={() => { setPopoverOpen(false); logout() }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#dc2626] hover:bg-[#fef2f2] transition-colors font-geist"
                >
                  <LogOut className="w-4 h-4" />
                  Выйти
                </button>
              </div>
            </div>
          )}

          {/* Clickable footer area */}
          <button
            onClick={() => setPopoverOpen(prev => !prev)}
            className="w-full flex items-center gap-3 text-left rounded-lg hover:bg-[#D8D9D6] p-1 -m-1 transition-colors"
          >
            <Avatar
              name={displayName}
              src={user.avatarUrl || undefined}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#111111] font-geist truncate">{displayName}</p>
              {email && <p className="text-xs text-[#666666] font-geist truncate">{email}</p>}
            </div>
          </button>
        </div>
      )}
    </aside>
  )
}
