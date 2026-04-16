import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { User, LogOut, Shield, Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/cn'
import { useAuth } from '@/app/providers/AuthProvider'
import { useTheme } from '@/app/providers/ThemeProvider'
import { Avatar } from '@/shared/ui/Avatar'
import { PRIMARY_NAV_ITEMS, isFullscreenPath, isNavItemActive } from '@/widgets/navigation/model/navigation'
import { PixelSidebarScene } from './PixelSidebarScene'

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { t, i18n } = useTranslation()
  const [popoverOpen, setPopoverOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!popoverOpen) return
    const handleMouseDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverOpen(false)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPopoverOpen(false)
    }
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKey)
    }
  }, [popoverOpen])

  const isFullScreen = isFullscreenPath(location.pathname)
  if (isFullScreen) return null

  const displayName = user ? `${user.firstName} ${user.lastName}`.trim() || user.username : ''
  const email = user?.telegramUsername ? `@${user.telegramUsername}` : ''
  const toggleLanguage = () => {
    void i18n.changeLanguage(i18n.language.startsWith('en') ? 'ru' : 'en')
  }

  return (
    <aside className={cn(
      'hidden md:flex w-[64px] lg:w-[220px] h-screen sticky top-0 flex-col flex-shrink-0 transition-all duration-200 relative overflow-hidden',
      'bg-[#E4EBE5] border-r border-[#C1CFC4]',
      'dark:bg-[#070E0C] dark:border-[#163028]',
    )}>
      {/* Pixel scene background */}
      <PixelSidebarScene compact={false} />

      {/* Logo — pixel style */}
      <div className="relative z-10 h-[72px] flex items-center justify-center lg:justify-start px-3 lg:px-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#059669] flex items-center justify-center flex-shrink-0 pixel-border" style={{ imageRendering: 'pixelated' }}>
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
            <span className="font-pixel text-[8px] text-[#059669] dark:text-[#34D399] tracking-wider leading-tight">
              DRUZYA
            </span>
            <span className="text-[9px] text-[#7A9982] dark:text-[#3A5A45] leading-tight font-pixel">v2</span>
          </div>
        </div>
      </div>

      {/* Navigation — wooden signs */}
      <nav className="relative z-10 flex-1 overflow-y-auto px-2 lg:px-3 flex flex-col gap-1.5 pt-2">
        {PRIMARY_NAV_ITEMS.map((item) => {
          const active = isNavItemActive(location.pathname, item)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              to={item.href}
              title={t(item.labelKey ?? item.label)}
              className={cn(
                'nav-sign relative flex items-center justify-center lg:justify-start gap-2.5 px-2 lg:px-3 py-2 rounded-none text-[11px] font-medium',
                active && 'is-active',
              )}
            >
              <Icon className="w-4 h-4 text-white/90" />
              <span className="hidden lg:block text-white/90 font-pixel text-[7px] tracking-wide">
                {t(item.labelKey ?? item.label)}
              </span>
            </Link>
          )
        })}

        {/* Theme & language toggles — smaller wooden buttons */}
        <div className="mt-3 pt-2 flex flex-col gap-1">
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? t('sidebar.theme.light') : t('sidebar.theme.dark')}
            className="nav-sign flex items-center justify-center lg:justify-start gap-2.5 px-2 lg:px-3 py-2 rounded-none text-[11px]"
          >
            {theme === 'dark'
              ? <Sun className="w-3.5 h-3.5 text-[#fbbf24]" />
              : <Moon className="w-3.5 h-3.5 text-white/80" />
            }
            <span className="hidden lg:block text-white/80 font-pixel text-[7px]">
              {theme === 'dark' ? t('sidebar.theme.light') : t('sidebar.theme.dark')}
            </span>
          </button>
          <button
            onClick={toggleLanguage}
            title={`${t('sidebar.lang.ru')} / ${t('sidebar.lang.en')}`}
            className="nav-sign flex items-center justify-center lg:justify-start gap-2.5 px-2 lg:px-3 py-2 rounded-none text-[11px]"
          >
            <span className="w-3.5 text-center text-[8px] font-pixel text-white/80">{i18n.language.startsWith('en') ? 'EN' : 'RU'}</span>
            <span className="hidden lg:block text-white/80 font-pixel text-[7px]">{t('sidebar.lang.ru')} | {t('sidebar.lang.en')}</span>
          </button>
        </div>
      </nav>

      {/* Footer with popover menu */}
      {user && (
        <div className="relative z-10 px-2 lg:px-4 py-3" ref={popoverRef}>
          {/* Popover */}
          {popoverOpen && (
            <div className={cn(
              'absolute bottom-full left-2 right-2 mb-2 shadow-lg border z-50 overflow-hidden card-stone',
            )}>
              <div className="px-4 py-3 flex items-center gap-3">
                <Avatar name={displayName} src={user.avatarUrl || undefined} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#111111] dark:text-[#E2F0E8] font-geist truncate">{displayName}</p>
                  {email && <p className="text-xs text-[#4B6B52] dark:text-[#4A7058] font-geist truncate">{email}</p>}
                </div>
              </div>

              <div className="h-px bg-[#B8A898] dark:bg-[#1E4035]" />

              <div className="py-1">
                <button
                  onClick={() => { setPopoverOpen(false); navigate('/profile') }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#111111] dark:text-[#C1D9CA] hover:bg-[#E6F0E8] dark:hover:bg-[#162E24] transition-colors font-geist"
                >
                  <User className="w-4 h-4 text-[#4B6B52] dark:text-[#4A7058]" />
                  {t('sidebar.profile')}
                </button>
                {user.isAdmin && (
                  <button
                    onClick={() => { setPopoverOpen(false); navigate('/admin') }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#059669] dark:text-[#34D399] hover:bg-[#ecfdf5] dark:hover:bg-[#0d2a1f] transition-colors font-geist"
                  >
                    <Shield className="w-4 h-4" />
                    {t('sidebar.admin')}
                  </button>
                )}
              </div>

              <div className="h-px bg-[#B8A898] dark:bg-[#1E4035]" />

              <div className="py-1">
                <button
                  onClick={() => { setPopoverOpen(false); logout() }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#dc2626] dark:text-[#f87171] hover:bg-[#fef2f2] dark:hover:bg-[#2a0f0f] transition-colors font-geist"
                >
                  <LogOut className="w-4 h-4" />
                  {t('sidebar.logout')}
                </button>
              </div>
            </div>
          )}

          {/* Clickable footer area — wooden style */}
          <button
            onClick={() => setPopoverOpen(prev => !prev)}
            className="nav-sign w-full flex items-center justify-center lg:justify-start gap-3 text-left rounded-none p-2 transition-colors"
          >
            <Avatar name={displayName} src={user.avatarUrl || undefined} size="sm" />
            <div className="hidden lg:block flex-1 min-w-0">
              <p className="text-xs font-medium text-white/90 font-geist truncate">{displayName}</p>
              {email && <p className="text-[9px] text-white/60 font-geist truncate">{email}</p>}
            </div>
          </button>
        </div>
      )}
    </aside>
  )
}
