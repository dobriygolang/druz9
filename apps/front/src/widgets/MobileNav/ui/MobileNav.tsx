import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ChevronRight, LogOut, Menu, Moon, Shield, Sparkles, Sun, User, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/cn'
import { useAuth } from '@/app/providers/AuthProvider'
import { useTheme } from '@/app/providers/ThemeProvider'
import { Avatar } from '@/shared/ui/Avatar'
import {
  PRIMARY_NAV_ITEMS,
  getMobileRouteMeta,
  isFullscreenPath,
  isNavItemActive,
} from '@/widgets/navigation/model/navigation'

const MENU_ITEMS = PRIMARY_NAV_ITEMS

export function MobileNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { t, i18n } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!menuOpen) return

    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
      }
    }

    document.body.style.overflow = 'hidden'
    document.body.classList.add('mobile-menu-open')
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.body.classList.remove('mobile-menu-open')
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  if (isFullscreenPath(location.pathname)) {
    return null
  }

  const routeMeta = getMobileRouteMeta(location.pathname)
  const displayName = user ? `${user.firstName} ${user.lastName}`.trim() || user.username : t('mobile.guest')
  const userMeta = user?.telegramUsername ? `@${user.telegramUsername}` : t('mobile.menuHint')

  return (
    <>
      <header className="mobile-topbar md:hidden">
        <div className="mobile-topbar__shell">
          <Link to="/home" className="flex items-center gap-3 min-w-0">
            <div className="mobile-brand-mark">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6366F1] dark:text-[#a5b4fc]">
                {t('app.name')}
              </p>
              <p className="truncate text-sm font-semibold text-[#111111] dark:text-[#f8fafc]">
                {t(routeMeta.titleKey ?? routeMeta.title)}
              </p>
              <p className="truncate text-[11px] text-[#667085] dark:text-[#7e93b0]">
                {t(routeMeta.subtitleKey ?? routeMeta.subtitle)}
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2 pl-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="mobile-icon-button"
              aria-label={theme === 'dark' ? t('theme.enableLight') : t('theme.enableDark')}
            >
              {theme === 'dark'
                ? <Sun className="w-4 h-4 text-[#fbbf24]" />
                : <Moon className="w-4 h-4 text-[#6366F1]" />
              }
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="mobile-icon-button mobile-icon-button--accent relative"
              aria-expanded={menuOpen}
              aria-label={t('mobile.navigation')}
            >
              <Menu className="w-4 h-4 text-white" />
              {user && (
                <span className="pointer-events-none absolute -right-1.5 -top-1.5 rounded-full border-2 border-white dark:border-[#08101f]">
                  <Avatar
                    name={displayName}
                    src={user.avatarUrl || undefined}
                    size="xs"
                  />
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className={cn('mobile-sheet md:hidden', menuOpen && 'is-open')} aria-hidden={!menuOpen}>
        <button
          type="button"
          className="mobile-sheet__backdrop"
          onClick={() => setMenuOpen(false)}
          aria-label={t('mobile.navigation')}
        />

        <aside className="mobile-sheet__panel">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#6366F1] dark:text-[#a5b4fc]">
                {t('mobile.navigation')}
              </p>
              <h2 className="mt-1 text-xl font-semibold text-[#111111] dark:text-[#f8fafc]">
                {t('mobile.quickAccess')}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="mobile-icon-button"
              aria-label={t('mobile.navigation')}
            >
              <X className="w-4 h-4 text-[#111111] dark:text-[#e2e8f3]" />
            </button>
          </div>

          <div className="mobile-sheet__profile">
            <div className="flex items-center gap-3">
              <Avatar
                name={displayName}
                src={user?.avatarUrl || undefined}
                size="md"
                className="ring-2 ring-white/80 dark:ring-[#101a31]"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#111111] dark:text-[#f8fafc]">
                  {displayName}
                </p>
                <p className="truncate text-xs text-[#667085] dark:text-[#7e93b0]">
                  {userMeta}
                </p>
              </div>
            </div>
            {!user && (
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="mobile-sheet__ghost"
              >
                {t('mobile.login')}
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon
              const active = isNavItemActive(location.pathname, item)

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn('mobile-sheet__nav-item', active && 'is-active')}
                  onClick={() => setMenuOpen(false)}
                >
                  <span className="mobile-sheet__nav-icon">
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[#111111] dark:text-[#f8fafc]">
                      {t(item.labelKey ?? item.label)}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-[#667085] dark:text-[#7e93b0]">
                      {t(item.descriptionKey ?? item.description)}
                    </span>
                  </span>
                  <ChevronRight className="w-4 h-4 flex-shrink-0 text-[#94a3b8] dark:text-[#4d6380]" />
                </Link>
              )
            })}
          </div>

          <div className="mobile-sheet__section">
            <button
              type="button"
              onClick={toggleTheme}
              className="mobile-sheet__action"
            >
              {theme === 'dark'
                ? <Sun className="w-4 h-4 text-[#fbbf24]" />
                : <Moon className="w-4 h-4 text-[#6366F1]" />
              }
              <span className="flex-1 text-left">
                {theme === 'dark' ? t('sidebar.theme.light') : t('sidebar.theme.dark')}
              </span>
            </button>

            <button
              type="button"
              onClick={() => void i18n.changeLanguage(i18n.language.startsWith('en') ? 'ru' : 'en')}
              className="mobile-sheet__action"
            >
              <span className="w-4 text-center text-[11px] font-bold text-[#6366F1] dark:text-[#a5b4fc]">
                {i18n.language.startsWith('en') ? 'EN' : 'RU'}
              </span>
              <span className="flex-1 text-left">{t('sidebar.lang.ru')} | {t('sidebar.lang.en')}</span>
            </button>

            {user && (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  navigate('/profile')
                }}
                className="mobile-sheet__action"
              >
                <User className="w-4 h-4 text-[#6366F1] dark:text-[#a5b4fc]" />
                <span className="flex-1 text-left">{t('sidebar.profile')}</span>
              </button>
            )}

            {user?.isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  navigate('/admin')
                }}
                className="mobile-sheet__action"
              >
                <Shield className="w-4 h-4 text-[#6366F1] dark:text-[#a5b4fc]" />
                <span className="flex-1 text-left">{t('sidebar.admin')}</span>
              </button>
            )}

            {user && (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  logout()
                }}
                className="mobile-sheet__action mobile-sheet__action--danger"
              >
                <LogOut className="w-4 h-4" />
                <span className="flex-1 text-left">{t('sidebar.logout')}</span>
              </button>
            )}
          </div>

          <p className="mt-auto px-1 pt-2 text-[11px] leading-relaxed text-[#94a3b8] dark:text-[#4d6380]">
            {t('mobile.menuFooter')}
          </p>
        </aside>
      </div>

      <nav className="mobile-dock md:hidden" aria-label={t('mobile.navigation')}>
        <div className="mobile-dock__rail">
          {PRIMARY_NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = isNavItemActive(location.pathname, item)

            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn('mobile-dock__item', active && 'is-active')}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="w-[18px] h-[18px]" />
                <span>{item.shortLabel ?? item.label}</span>
              </Link>
            )
          })}
          <Link
            to="/profile"
            className={cn('mobile-dock__item', location.pathname.startsWith('/profile') && 'is-active')}
            aria-current={location.pathname.startsWith('/profile') ? 'page' : undefined}
          >
            <User className="w-[18px] h-[18px]" />
            <span>{t('nav.profile')}</span>
          </Link>
        </div>
      </nav>
    </>
  )
}
