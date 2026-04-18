import { useState } from 'react'

interface Notif {
  id: string
  kind: 'xp' | 'duel' | 'event' | 'guild'
  text: string
  time: string
  unread: boolean
}

// Mock data — wired to notification service later.
const MOCK: Notif[] = [
  { id: '1', kind: 'duel', text: 'Kira challenged you to a duel', time: '2m', unread: true },
  { id: '2', kind: 'xp', text: '+120 XP from daily pact', time: '1h', unread: true },
  { id: '3', kind: 'guild', text: 'Guild war starts in 6h', time: '3h', unread: true },
  { id: '4', kind: 'event', text: 'New event: Autumn Gauntlet', time: '1d', unread: false },
]

/**
 * Notification bell. Renders as an inline action button so callers can
 * slot it into their own header row (e.g. HeroStrip) — this avoids the
 * old `position: fixed` overlay that fought HeroStrip's own action row
 * and hid behind the page header on narrow viewports.
 *
 * The unread-count dropdown is still absolutely positioned relative to
 * the button, so wrap this component in a `position: relative` container
 * if you want the dropdown contained.
 */
export function NotificationBell({ onOpen }: { onOpen?: () => void }) {
  const [open, setOpen] = useState(false)
  const unread = MOCK.filter((n) => n.unread).length

  const handleClick = () => {
    if (onOpen) {
      onOpen()
    } else {
      setOpen((v) => !v)
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        className="rpg-btn rpg-btn--icon"
        onClick={handleClick}
        aria-label="Notifications"
        style={{ position: 'relative', padding: 10 }}
      >
        🔔
        {unread > 0 && (
          <span
            className="rpg-badge rpg-badge--ember"
            style={{
              position: 'absolute',
              top: -8,
              right: -8,
              fontSize: 9,
              minWidth: 18,
              height: 18,
              padding: '2px 4px',
              justifyContent: 'center',
            }}
          >
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div
          className="rpg-panel"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            width: 320,
            maxHeight: 420,
            overflow: 'auto',
            padding: 12,
            zIndex: 50,
          }}
        >
          <div
            className="font-display uppercase"
            style={{ fontSize: 14, marginBottom: 10, letterSpacing: '0.06em' }}
          >
            Missives
          </div>
          {MOCK.map((n) => (
            <div
              key={n.id}
              className={`rpg-quest ${n.unread ? 'rpg-quest--active' : ''}`}
              style={{ marginBottom: 6 }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13 }}>{n.text}</div>
                <div
                  className="font-silkscreen uppercase"
                  style={{
                    fontSize: 9,
                    color: 'var(--ink-2)',
                    letterSpacing: '0.08em',
                    marginTop: 2,
                  }}
                >
                  {n.kind} · {n.time} ago
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
