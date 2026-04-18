import { RpgButton } from '@/shared/ui/pixel'

type NotifKind = 'duel' | 'guild' | 'friend' | 'event' | 'system' | 'mentor' | 'shop'

interface Notif {
  kind: NotifKind
  t: string
  d: string
  hot?: boolean
}

const GROUPS: Array<{ k: string; items: Notif[] }> = [
  {
    k: 'TODAY',
    items: [
      { kind: 'duel', t: 'glowbeacon challenged you', d: 'Graphs · medium · 14m ago', hot: true },
      { kind: 'guild', t: 'Guild war — DP Canyon is losing', d: '30m ago', hot: true },
      { kind: 'friend', t: 'lunarfox just hit ELO 1800', d: '1h ago' },
      { kind: 'event', t: 'Harvest Festival · 3 apples from milestone', d: '2h ago' },
    ],
  },
  {
    k: 'YESTERDAY',
    items: [
      { kind: 'system', t: 'Tier 18 unlocked — Knight of Ember', d: 'season pass' },
      { kind: 'mentor', t: 'System Design mentor left feedback', d: '18h ago' },
      { kind: 'shop', t: 'Limited item: Ember Crown back in stock', d: '22h ago' },
    ],
  },
]

const ICON: Record<NotifKind, string> = {
  duel: '⚔',
  guild: '⚑',
  friend: '✦',
  event: '◈',
  system: '★',
  mentor: '◎',
  shop: '$',
}

const COLOR: Record<NotifKind, string> = {
  duel: 'var(--rpg-danger, #a23a2a)',
  guild: 'var(--moss-1)',
  friend: 'var(--ember-1)',
  event: 'var(--r-epic)',
  system: 'var(--ember-1)',
  mentor: 'var(--r-legendary)',
  shop: 'var(--ember-2)',
}

export function NotificationsPanel({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 380,
        zIndex: 60,
        background: 'var(--parch-1)',
        border: '4px solid var(--ink-0)',
        boxShadow: '-6px 0 0 var(--ink-0)',
        display: 'flex',
        flexDirection: 'column',
        animation: 'rpg-slide-in-right 0.18s ease-out',
      }}
    >
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '3px dashed var(--ink-3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div
            className="font-silkscreen uppercase"
            style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.1em' }}
          >
            HERALD'S DESK
          </div>
          <h3 className="font-display" style={{ margin: 0, fontSize: 17 }}>
            Notifications · 7
          </h3>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <RpgButton size="sm">Mark all read</RpgButton>
          <RpgButton size="sm" onClick={onClose}>
            ✕
          </RpgButton>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {GROUPS.map((g) => (
          <div key={g.k}>
            <div className="rpg-sidenav__section" style={{ margin: '10px 14px 4px' }}>
              {g.k}
            </div>
            {g.items.map((n, i) => (
              <div
                key={i}
                style={{
                  padding: '10px 14px',
                  borderBottom: '1px dashed var(--ink-3)',
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                  background: n.hot ? 'rgba(233,184,102,0.08)' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    background: COLOR[n.kind],
                    border: '2px solid var(--ink-0)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--parch-0)',
                    fontFamily: 'Silkscreen, monospace',
                    flexShrink: 0,
                  }}
                >
                  {ICON[n.kind]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 13, lineHeight: 1.3 }}>
                    {n.t}
                  </div>
                  <div
                    className="font-silkscreen uppercase"
                    style={{ fontSize: 9, color: 'var(--ink-2)', marginTop: 2, letterSpacing: '0.08em' }}
                  >
                    {n.d}
                  </div>
                </div>
                {n.hot && (
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      background: 'var(--ember-1)',
                      border: '2px solid var(--ink-0)',
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ padding: 10, borderTop: '3px dashed var(--ink-3)' }}>
        <RpgButton size="sm" style={{ width: '100%' }}>
          Notification preferences
        </RpgButton>
      </div>
    </div>
  )
}
