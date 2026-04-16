import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Globe2, LogOut, Moon, Shield, Sparkles, Sun, User } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/app/providers/AuthProvider'
import { useTheme } from '@/app/providers/ThemeProvider'
import { Avatar } from '@/shared/ui/Avatar'
import { cn } from '@/shared/lib/cn'
import { PRIMARY_NAV_ITEMS, isFullscreenPath, isNavItemActive } from '@/widgets/navigation/model/navigation'

export function HubTopNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { t, i18n } = useTranslation()
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!profileOpen) return

    const handleMouseDown = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setProfileOpen(false)
    }

    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [profileOpen])

  if (isFullscreenPath(location.pathname)) {
    return null
  }

  const displayName = user ? `${user.firstName} ${user.lastName}`.trim() || user.username : t('mobile.guest')
  const userMeta = user?.telegramUsername ? `@${user.telegramUsername}` : t('sidebar.profile')

  // ── Game HUD mode on /home ──
  if (location.pathname === '/home') {
    return (
      <header
        className="fixed top-0 left-0 right-0 hidden md:flex items-center"
        style={{
          height: 38,
          zIndex: 70,
          background: 'linear-gradient(180deg, rgba(4,8,4,0.78) 0%, rgba(4,8,4,0.55) 100%)',
          borderBottom: '1px solid rgba(170,145,65,0.18)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <div className="mx-auto flex items-center w-full max-w-[1600px] px-4 gap-2">
          {/* Nav items */}
          <nav className="flex items-center gap-0.5 flex-1">
            {PRIMARY_NAV_ITEMS.map((item) => {
              const active = isNavItemActive(location.pathname, item)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded transition-all',
                    active
                      ? 'text-[#E8C96A] border border-[rgba(220,185,80,0.3)] bg-[rgba(220,185,80,0.1)]'
                      : 'text-[rgba(160,210,140,0.65)] hover:text-[rgba(210,250,190,0.9)] hover:bg-[rgba(255,255,255,0.06)] border border-transparent'
                  )}
                  style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, lineHeight: 1 }}
                >
                  <Icon className="w-3 h-3 flex-shrink-0" />
                  <span>{t(item.labelKey ?? item.label)}</span>
                </Link>
              )
            })}
          </nav>
          {/* Utilities */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => void i18n.changeLanguage(i18n.language.startsWith('en') ? 'ru' : 'en')}
              className="flex items-center justify-center w-7 h-7 rounded transition-all text-[rgba(150,200,130,0.6)] hover:text-[rgba(210,250,190,0.9)] hover:bg-[rgba(255,255,255,0.08)]"
              style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700 }}
            >
              {i18n.language.startsWith('en') ? 'EN' : 'RU'}
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center justify-center w-7 h-7 rounded transition-all text-[rgba(150,200,130,0.6)] hover:text-[rgba(210,250,190,0.9)] hover:bg-[rgba(255,255,255,0.08)]"
            >
              {theme === 'dark'
                ? <Sun className="h-3.5 w-3.5 text-[#FBBF24]" />
                : <Moon className="h-3.5 w-3.5" />
              }
            </button>
            {user ? (
              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="flex items-center gap-1.5 px-2 py-1 rounded transition-all hover:bg-[rgba(255,255,255,0.08)]"
              >
                <Avatar name={displayName} src={user.avatarUrl || undefined} size="sm" />
                <span
                  className="hidden lg:block text-[rgba(160,210,140,0.8)] truncate max-w-[80px]"
                  style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9 }}
                >
                  {user.firstName || user.username}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-[rgba(170,145,65,0.3)] transition-all text-[rgba(160,210,140,0.7)] hover:bg-[rgba(255,255,255,0.08)]"
                style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9 }}
              >
                {t('mobile.login')}
              </button>
            )}
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="hidden md:block">
      <div className="hub-top-nav">
        <div className="hub-top-nav__inner">
          <Link to="/home" className="hub-top-nav__brand">
            <div className="hub-top-nav__brand-mark">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="hub-top-nav__brand-name">{t('app.name')}</p>
              <p className="hub-top-nav__brand-subtitle">{t('route.home.subtitle')}</p>
            </div>
          </Link>

          <nav className="hub-top-nav__rail" aria-label={t('mobile.navigation')}>
            {PRIMARY_NAV_ITEMS.map((item) => {
              const active = isNavItemActive(location.pathname, item)
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn('hub-top-nav__item', active && 'is-active')}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span>{t(item.labelKey ?? item.label)}</span>
                </Link>
              )
            })}
          </nav>

          <div className="hub-top-nav__utilities">
            <button
              type="button"
              onClick={() => void i18n.changeLanguage(i18n.language.startsWith('en') ? 'ru' : 'en')}
              className="hub-utility-chip"
              aria-label={`${t('sidebar.lang.ru')} / ${t('sidebar.lang.en')}`}
            >
              <Globe2 className="h-4 w-4" />
              <span>{i18n.language.startsWith('en') ? 'EN' : 'RU'}</span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className="hub-utility-chip"
              aria-label={theme === 'dark' ? t('theme.enableLight') : t('theme.enableDark')}
            >
              {theme === 'dark'
                ? <Sun className="h-4 w-4 text-[#FBBF24]" />
                : <Moon className="h-4 w-4" />
              }
            </button>

            {user ? (
              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => setProfileOpen(prev => !prev)}
                  className="hub-profile-chip"
                  aria-expanded={profileOpen}
                >
                  <Avatar name={displayName} src={user.avatarUrl || undefined} size="sm" />
                  <div className="min-w-0 text-left">
                    <p className="truncate text-[11px] font-semibold text-[#2C1810] dark:text-[#E2F0E8]">
                      {displayName}
                    </p>
                    <p className="truncate text-[10px] text-[#7A6550] dark:text-[#7BA88A]">
                      {userMeta}
                    </p>
                  </div>
                </button>

                {profileOpen && (
                  <div className="hub-profile-menu">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false)
                        navigate('/profile')
                      }}
                      className="hub-profile-menu__item"
                    >
                      <User className="h-4 w-4" />
                      <span>{t('sidebar.profile')}</span>
                    </button>

                    {user.isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false)
                          navigate('/admin')
                        }}
                        className="hub-profile-menu__item hub-profile-menu__item--accent"
                      >
                        <Shield className="h-4 w-4" />
                        <span>{t('sidebar.admin')}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false)
                        logout()
                      }}
                      className="hub-profile-menu__item hub-profile-menu__item--danger"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>{t('sidebar.logout')}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="hub-profile-chip"
              >
                <Avatar name={displayName} size="sm" />
                <div className="min-w-0 text-left">
                  <p className="truncate text-[11px] font-semibold text-[#2C1810] dark:text-[#E2F0E8]">
                    {displayName}
                  </p>
                  <p className="truncate text-[10px] text-[#7A6550] dark:text-[#7BA88A]">
                    {t('mobile.login')}
                  </p>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
