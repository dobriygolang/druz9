import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

interface AdminNavItem {
  labelKey: string
  icon: string // pixel glyph
  href: string
}

// Order matches conceptual importance in the admin flow: content
// management first (tasks / questions / podcasts), then economy
// (shop / seasonpass), then observability and config.
export const ADMIN_NAV: AdminNavItem[] = [
  { labelKey: 'admin.nav.dashboard',    icon: '▦', href: '/admin' },
  { labelKey: 'admin.nav.codeTasks',    icon: '⟨⟩', href: '/admin/code-tasks' },
  { labelKey: 'admin.nav.interviewPrep', icon: '☰', href: '/admin/interview-prep' },
  { labelKey: 'admin.nav.podcasts',     icon: '♪', href: '/admin/podcasts' },
  { labelKey: 'admin.nav.shop',         icon: '$', href: '/admin/shop' },
  { labelKey: 'admin.nav.seasonpass',   icon: '★', href: '/admin/seasonpass' },
  { labelKey: 'admin.nav.aiBots',       icon: '◉', href: '/admin/ai-bots' },
  { labelKey: 'admin.nav.notifications', icon: '✉', href: '/admin/notifications' },
  { labelKey: 'admin.nav.analytics',    icon: '▨', href: '/admin/analytics' },
  { labelKey: 'admin.nav.logs',         icon: '▤', href: '/admin/logs' },
  { labelKey: 'admin.nav.config',       icon: '⚙', href: '/admin/config' },
]

export function AdminSidebar() {
  const { t } = useTranslation()

  return (
    <nav
      style={{
        width: 220,
        minHeight: 'calc(100vh - 52px)',
        background: 'var(--parch-1)',
        borderRight: '3px dashed var(--ink-3)',
        padding: '14px 10px',
        flexShrink: 0,
      }}
    >
      <div
        className="font-silkscreen uppercase"
        style={{
          padding: '0 10px 8px',
          fontSize: 10,
          letterSpacing: '0.1em',
          color: 'var(--ink-2)',
        }}
      >
        {t('admin.manage')}
      </div>
      {ADMIN_NAV.map((item) => (
        <NavLink
          key={item.href}
          to={item.href}
          end={item.href === '/admin'}
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '9px 12px',
            marginBottom: 4,
            border: isActive ? '2px solid var(--ember-1)' : '2px solid transparent',
            background: isActive ? 'var(--parch-2)' : 'transparent',
            boxShadow: isActive ? '2px 2px 0 var(--ember-1)' : 'none',
            fontFamily: 'Pixelify Sans, Unbounded, monospace',
            fontSize: 13,
            color: 'var(--ink-0)',
            textDecoration: 'none',
            cursor: 'pointer',
          })}
        >
          <span
            style={{
              fontFamily: 'Silkscreen, Unbounded, monospace',
              fontSize: 14,
              color: 'var(--ember-1)',
              width: 18,
              textAlign: 'center',
            }}
          >
            {item.icon}
          </span>
          {t(item.labelKey)}
        </NavLink>
      ))}
    </nav>
  )
}
