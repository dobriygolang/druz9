import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Home, Users, Code2, TrendingUp, Mic, User, LogOut, Flame, Shield, Moon, Sun } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { useAuth } from '@/app/providers/AuthProvider'
import { useTheme } from '@/app/providers/ThemeProvider'
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
  { label: 'Daily', icon: <Flame className="w-4 h-4" />, href: '/daily-challenge' },
  { label: 'Growth', icon: <TrendingUp className="w-4 h-4" />, href: '/growth', matchPrefix: '/growth' },
  { label: 'Подкасты', icon: <Mic className="w-4 h-4" />, href: '/podcasts' },
]

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [popoverOpen, setPopoverOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    if (!popoverOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPopoverOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [popoverOpen])

  const isFullScreen = location.pathname.startsWith('/code-rooms/') || location.pathname.startsWith('/arena/') || location.pathname.startsWith('/growth/interview-prep/mock/')
  if (isFullScreen) return null

  const isActive = (item: NavItem) => {
    if (item.matchPrefix) return location.pathname.startsWith(item.matchPrefix)
    return location.pathname === item.href
  }

  const displayName = user ? `${user.firstName} ${user.lastName}`.trim() || user.username : ''
  const email = user?.telegramUsername ? `@${user.telegramUsername}` : ''

  return (
    <aside className={cn(
      'hidden md:flex w-[64px] lg:w-[220px] h-screen sticky top-0 flex-col flex-shrink-0 transition-all duration-200',
      'bg-[#E7E8E5] border-r border-[#CBCCC9]',
      'dark:bg-[#0b0d16] dark:border-[#1a2540]',
    )}>
      {/* Logo */}
      <div className="h-[72px] flex items-center justify-center lg:justify-start px-3 lg:px-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#6366F1] rounded-lg flex items-center justify-center flex-shrink-0 shadow-[0_2px_8px_rgba(99,102,241,0.35)]">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <line x1="5" y1="6" x2="15" y2="6"  stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeOpacity="0.6"/>
              <line x1="5" y1="6" x2="10" y2="15" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeOpacity="0.6"/>
              <line x1="15" y1="6" x2="10" y2="15" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeOpacity="0.6"/>
              <circle cx="5"  cy="6"  r="2.4" fill="white"/>
              <circle cx="15" cy="6"  r="2.4" fill="white"/>
              <circle cx="10" cy="15" r="2.4" fill="white"/>
            </svg>
          </div>
          <div className="hidden lg:flex flex-col">
            <span
              className="font-bold text-[13px] text-[#6366F1] dark:text-[#818cf8] tracking-[0.18em] leading-tight uppercase"
              style={{ fontFamily: 'Geist, Inter, system-ui, sans-serif' }}
            >
              ДРУЗЬЯ
            </span>
            <span className="text-[10px] text-[#94a3b8] dark:text-[#3d5570] leading-tight" style={{ fontFamily: 'Geist, Inter, system-ui, sans-serif' }}>v2.0.0</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 lg:px-3 flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item)
          return (
            <Link
              key={item.href}
              to={item.href}
              title={item.label}
              className={cn(
                'relative flex items-center justify-center lg:justify-start gap-2.5 px-2 lg:px-3 py-2.5 rounded-full text-[13px] font-medium transition-all duration-200 font-geist',
                active
                  ? 'bg-[#CBCCC9] text-[#111111] dark:bg-[#1a2640] dark:text-[#e2e8f3]'
                  : 'text-[#666666] hover:bg-[#D8D9D6] hover:text-[#111111] dark:text-[#4d6380] dark:hover:bg-[#141d30] dark:hover:text-[#c8d8ec]',
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-[#6366F1] dark:bg-[#818cf8] rounded-r-full" />
              )}
              {item.icon}
              <span className="hidden lg:block">{item.label}</span>
            </Link>
          )
        })}

        {/* Theme toggle */}
        <div className="mt-2 pt-2 border-t border-[#CBCCC9] dark:border-[#1a2540]">
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
            className={cn(
              'w-full flex items-center justify-center lg:justify-start gap-2.5 px-2 lg:px-3 py-2.5 rounded-full text-[13px] font-medium transition-all duration-200 font-geist',
              'text-[#666666] hover:bg-[#D8D9D6] hover:text-[#111111]',
              'dark:text-[#4d6380] dark:hover:bg-[#141d30] dark:hover:text-[#c8d8ec]',
            )}
          >
            {theme === 'dark'
              ? <Sun className="w-4 h-4 text-[#fbbf24]" />
              : <Moon className="w-4 h-4" />
            }
            <span className="hidden lg:block">
              {theme === 'dark' ? 'Светлая' : 'Тёмная'}
            </span>
          </button>
        </div>
      </nav>

      {/* Footer with popover menu */}
      {user && (
        <div className="relative px-2 lg:px-4 py-4 border-t border-[#CBCCC9] dark:border-[#1a2540]" ref={popoverRef}>
          {/* Popover */}
          {popoverOpen && (
            <div className={cn(
              'absolute bottom-full left-3 right-3 mb-2 rounded-xl shadow-lg border z-50 overflow-hidden',
              'bg-white border-[#CBCCC9]',
              'dark:bg-[#161c2d] dark:border-[#1e3158]',
            )}>
              {/* User info */}
              <div className="px-4 py-3 flex items-center gap-3">
                <Avatar name={displayName} src={user.avatarUrl || undefined} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#111111] dark:text-[#e2e8f3] font-geist truncate">{displayName}</p>
                  {email && <p className="text-xs text-[#666666] dark:text-[#4d6380] font-geist truncate">{email}</p>}
                </div>
              </div>

              <div className="h-px bg-[#CBCCC9] dark:bg-[#1a2540]" />

              <div className="py-1">
                <button
                  onClick={() => { setPopoverOpen(false); navigate('/profile') }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#111111] dark:text-[#c8d8ec] hover:bg-[#F2F3F0] dark:hover:bg-[#1a2236] transition-colors font-geist"
                >
                  <User className="w-4 h-4 text-[#666666] dark:text-[#4d6380]" />
                  Мой профиль
                </button>
                {user.isAdmin && (
                  <button
                    onClick={() => { setPopoverOpen(false); navigate('/admin') }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#6366F1] dark:text-[#818cf8] hover:bg-[#EEF2FF] dark:hover:bg-[#1e1e4a] transition-colors font-geist"
                  >
                    <Shield className="w-4 h-4" />
                    Админ панель
                  </button>
                )}
              </div>

              <div className="h-px bg-[#CBCCC9] dark:bg-[#1a2540]" />

              <div className="py-1">
                <button
                  onClick={() => { setPopoverOpen(false); logout() }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#dc2626] dark:text-[#f87171] hover:bg-[#fef2f2] dark:hover:bg-[#2a0f0f] transition-colors font-geist"
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
            className="w-full flex items-center justify-center lg:justify-start gap-3 text-left rounded-lg hover:bg-[#D8D9D6] dark:hover:bg-[#141d30] p-1 -m-1 transition-colors"
          >
            <Avatar name={displayName} src={user.avatarUrl || undefined} size="sm" />
            <div className="hidden lg:block flex-1 min-w-0">
              <p className="text-sm font-medium text-[#111111] dark:text-[#e2e8f3] font-geist truncate">{displayName}</p>
              {email && <p className="text-xs text-[#666666] dark:text-[#4d6380] font-geist truncate">{email}</p>}
            </div>
          </button>
        </div>
      )}
    </aside>
  )
}
