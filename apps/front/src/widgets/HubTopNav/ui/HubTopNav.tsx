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
