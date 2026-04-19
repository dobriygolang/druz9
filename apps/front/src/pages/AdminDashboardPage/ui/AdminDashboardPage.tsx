import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Panel, Badge } from '@/shared/ui/pixel'

interface Card {
  href: string
  title: string
  body: string
  icon: string
  accent: string
}

// Landing for /admin — picks the eight sections that matter most and
// links out to each. Kept deliberately light (no live counters yet) so
// the page loads even if back-office endpoints aren't wired.
const CARDS: Card[] = [
  {
    href: '/admin/code-tasks',
    title: 'Code tasks',
    body: 'Create and curate algo / SQL / system-design tasks that feed the atlas and mock interviews.',
    icon: '⟨⟩',
    accent: '#3d6149',
  },
  {
    href: '/admin/interview-prep',
    title: 'Interview prep',
    body: 'Company presets, question pools, mock blueprints. The engine behind /interview and peer mocks.',
    icon: '☰',
    accent: '#7a3d12',
  },
  {
    href: '/admin/podcasts',
    title: 'Podcasts',
    body: 'Upload episodes (chunked), manage cover art, retire old ones.',
    icon: '♪',
    accent: '#3b6a8f',
  },
  {
    href: '/admin/shop',
    title: 'Tavern / shop',
    body: 'Catalog of items users buy with gold/gems. Rarity, pricing, seasonal rotations.',
    icon: '$',
    accent: '#b8692a',
  },
  {
    href: '/admin/seasonpass',
    title: 'Season pass',
    body: 'Tier ladder (free + premium), reward configuration, season schedule.',
    icon: '★',
    accent: '#e9b866',
  },
  {
    href: '/admin/ai-bots',
    title: 'AI mentors',
    body: 'Provider × model × tier × prompt. Powers the "choose mentor" cards in interview prep.',
    icon: '◉',
    accent: '#7a4a8f',
  },
  {
    href: '/admin/notifications',
    title: 'Notifications',
    body: 'Targeted broadcasts to user cohorts. Delivery goes through the notification service.',
    icon: '✉',
    accent: '#a23a2a',
  },
  {
    href: '/admin/analytics',
    title: 'Analytics',
    body: 'DAU / MAU, mock completion, retention cohorts, currency sinks.',
    icon: '▨',
    accent: '#4d6f4a',
  },
  {
    href: '/admin/users',
    title: 'Users',
    body: 'Поиск и редактирование пользователей. Выдача валюты, флаги доступа.',
    icon: '☻',
    accent: '#5b4331',
  },
]

export function AdminDashboardPage() {
  const { t } = useTranslation()

  return (
    <>
      <div style={{ marginBottom: 22 }}>
        <div
          className="font-silkscreen uppercase"
          style={{ fontSize: 10, color: 'var(--ember-1)', letterSpacing: '0.12em' }}
        >
          {t('admin.dashboard.eyebrow', { defaultValue: 'Control panel' })}
        </div>
        <h1 className="font-display" style={{ margin: '4px 0 6px', fontSize: 30 }}>
          {t('admin.dashboard.title', { defaultValue: 'Manage the world' })}
        </h1>
        <div style={{ color: 'var(--ink-2)', fontSize: 13, maxWidth: 640 }}>
          {t('admin.dashboard.subtitle', {
            defaultValue: 'Everything that feeds the player experience — tasks, mocks, podcasts, the shop, season pass. Edit on the left; see changes live on the right.',
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
        {CARDS.map((c) => (
          <Link key={c.href} to={c.href} style={{ textDecoration: 'none' }}>
            <Panel
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    background: c.accent,
                    border: '3px solid var(--ink-0)',
                    boxShadow: 'inset 2px 2px 0 rgba(255,255,255,0.15), inset -2px -2px 0 rgba(0,0,0,0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'Silkscreen, monospace',
                    fontSize: 20,
                    color: 'var(--parch-0)',
                  }}
                >
                  {c.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 18, color: 'var(--ink-0)' }}>
                    {c.title}
                  </div>
                  <Badge variant="dark">{c.href}</Badge>
                </div>
              </div>
              <div style={{ color: 'var(--ink-2)', fontSize: 12, lineHeight: 1.45 }}>{c.body}</div>
            </Panel>
          </Link>
        ))}
      </div>
    </>
  )
}
