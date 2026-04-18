import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { NavIcon } from '@/shared/ui/sprites'
import { Bar } from '@/shared/ui/pixel'
import { NAV_GROUPS, type NavItem } from '../model/nav'
import { useSidebarBadges } from '../model/badges'
import { useApi } from '@/shared/hooks/useApi'
import { hubApi } from '@/features/Hub/api/hubApi'
import { useAuth } from '@/app/providers/AuthProvider'

interface SidebarProps {
  open?: boolean
  onClose?: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { pathname } = useLocation()
  const { t } = useTranslation()
  const badges = useSidebarBadges()
  const { user } = useAuth()
  const isAdmin = Boolean(user?.isAdmin)
  const { data: overview } = useApi(() => hubApi.getOverview(), [])
  // Today's pact = first incomplete daily mission, or the final one once
  // all are done so the card still says something cheerful.
  const missions = overview?.dailyMissions ?? []
  const todaysPact = missions.find((m) => !m.completed) ?? missions[missions.length - 1] ?? null
  const pactPct = todaysPact && todaysPact.target > 0
    ? Math.round((todaysPact.current / todaysPact.target) * 100)
    : 0

  return (
    <>
      {/* mobile overlay */}
      {open && (
        <div
          className="rpg-sidebar-overlay"
          style={{ display: 'none' }}
          onClick={onClose}
        />
      )}

      <nav
        className={`rpg-sidenav${open ? ' rpg-sidenav--open' : ''}`}
        style={{
          position: 'fixed',
          top: 140,
          left: 0,
          height: 'calc(100vh - 140px)',
          overflowY: 'auto',
          zIndex: 40,
        }}
      >
        {NAV_GROUPS.map((group) => {
          const visible = group.items.filter((item) => !item.adminOnly || isAdmin)
          if (visible.length === 0) return null
          return (
            <div key={group.labelKey}>
              <div className="rpg-sidenav__section rpg-sidenav__label">{t(group.labelKey)}</div>
              {visible.map((item) => (
                <NavRow
                  key={item.id}
                  item={item}
                  currentPath={pathname}
                  onNavigate={onClose}
                  liveBadge={item.badgeKey ? badges[item.badgeKey] : undefined}
                />
              ))}
            </div>
          )
        })}

        {todaysPact && (
          <div
            className="rpg-sidenav__pact"
            style={{ marginTop: 20, padding: '12px 10px', border: '3px dashed var(--ink-3)' }}
          >
            <div
              className="font-silkscreen uppercase"
              style={{ fontSize: 9, marginBottom: 6, color: 'var(--ink-2)', letterSpacing: '0.1em' }}
            >
              {t('sidebar.todaysPact')}
            </div>
            <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 13, marginBottom: 8 }}>
              {todaysPact.title}
            </div>
            <Bar value={pactPct} />
            <div
              className="font-silkscreen uppercase"
              style={{ fontSize: 9, marginTop: 6, color: 'var(--ink-2)', letterSpacing: '0.1em' }}
            >
              {todaysPact.current} / {todaysPact.target}
              {todaysPact.rewardLabel ? ` · ${todaysPact.rewardLabel}` : ''}
            </div>
          </div>
        )}
      </nav>
    </>
  )
}

function NavRow({
  item,
  currentPath,
  onNavigate,
  liveBadge,
}: {
  item: NavItem
  currentPath: string
  onNavigate?: () => void
  liveBadge?: number
}) {
  const { t } = useTranslation()
  const active =
    currentPath === item.path ||
    (item.path !== '/' && currentPath.startsWith(item.path + '/')) ||
    (item.path === '/hub' && currentPath === '/')

  // Prefer dynamic liveBadge over static; show only when > 0.
  const dynamicBadge =
    typeof liveBadge === 'number' && liveBadge > 0
      ? { kind: 'ember' as const, text: String(liveBadge) }
      : undefined
  const badge = dynamicBadge ?? item.badge

  return (
    <NavLink
      to={item.path}
      className={`rpg-sidenav__item ${active ? 'rpg-sidenav__item--active' : ''}`}
      onClick={onNavigate}
    >
      <span className="rpg-sidenav__icon" style={{ width: 20, height: 20, flexShrink: 0 }}>
        <NavIcon kind={item.icon} size={18} color={active ? '#e9b866' : '#5a3f27'} />
      </span>
      <div
        className="rpg-sidenav__label"
        style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1, minWidth: 0 }}
      >
        <span
          style={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: 130,
          }}
        >
          {t(item.labelKey)}
        </span>
        <span
          className="rpg-sidenav__hint font-silkscreen uppercase"
          style={{
            fontSize: 9,
            letterSpacing: '0.08em',
            color: active ? 'var(--parch-2)' : 'var(--ink-3)',
          }}
        >
          {t(item.hintKey)}
        </span>
      </div>
      {badge && (
        <span
          className={`rpg-sidenav__badge rpg-badge ${
            badge.kind === 'ember' ? 'rpg-badge--ember' : 'rpg-badge--dark'
          }`}
          style={{ marginLeft: 'auto', fontSize: 9 }}
        >
          {'text' in badge ? badge.text : t(badge.textKey)}
        </span>
      )}
    </NavLink>
  )
}
