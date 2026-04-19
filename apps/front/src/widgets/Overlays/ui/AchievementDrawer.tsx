import { RpgButton } from '@/shared/ui/pixel'
import { Trophy } from '@/shared/ui/sprites'

export interface Achievement {
  t: string
  rare: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  desc: string
  earned: string
  story: string
  progress: number
  steps: Array<[string, boolean]>
  pinned?: boolean
}

const DEFAULT: Achievement = {
  t: 'Siegebreaker',
  rare: 'epic',
  desc: 'Win a guild war as an active deployed member.',
  earned: 'season II · day 12',
  story: 'During the long siege of Ashford, Mossveil held three fronts until dawn. You were among them.',
  progress: 1,
  steps: [
    ['Join a guild', true],
    ['Deploy in a war', true],
    ['Capture 3 fronts', true],
    ['Survive to victory', true],
  ],
  pinned: true,
}

export function AchievementDrawer({
  open,
  onClose,
  achievement,
}: {
  open: boolean
  onClose: () => void
  achievement?: Achievement
}) {
  if (!open) return null
  const a = achievement || DEFAULT
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 70,
        padding: '0 0 0 228px',
      }}
    >
      <div
        className="rpg-panel rpg-panel--nailed"
        style={{
          padding: 0,
          margin: 0,
          animation: 'rpg-slide-up 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '160px 1fr 220px',
            gap: 20,
            padding: 18,
            alignItems: 'center',
          }}
        >
          <div
            className={`rpg-rarity-border--${a.rare}`}
            style={{
              width: 140,
              height: 140,
              border: '4px solid var(--ink-0)',
              background: 'var(--parch-0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Trophy scale={4} tier="gold" />
          </div>
          <div>
            <div
              className="font-silkscreen uppercase"
              style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.1em' }}
            >
              ACHIEVEMENT · {a.rare}
            </div>
            <h2
              className="font-display"
              style={{ whiteSpace: 'normal', margin: '4px 0', fontSize: 22 }}
            >
              {a.t}
            </h2>
            <div style={{ color: 'var(--ink-2)', fontSize: 12, marginBottom: 8 }}>{a.desc}</div>
            <div
              className="font-silkscreen uppercase"
              style={{
                fontSize: 10,
                color: 'var(--ink-2)',
                fontStyle: 'italic',
                letterSpacing: '0.06em',
              }}
            >
              "{a.story}"
            </div>
            <div className="rpg-divider" style={{ margin: '12px 0' }} />
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              {a.steps.map(([s, done], i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      background: done ? 'var(--moss-1)' : 'var(--parch-3)',
                      border: '2px solid var(--ink-0)',
                      color: 'var(--parch-0)',
                      fontSize: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'Silkscreen, Unbounded, monospace',
                    }}
                  >
                    {done && '✓'}
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      color: done ? 'var(--ink-0)' : 'var(--ink-2)',
                    }}
                  >
                    {s}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div
              className="font-silkscreen uppercase"
              style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
            >
              earned
            </div>
            <div
              style={{ fontFamily: 'Pixelify Sans, Unbounded, monospace', fontSize: 14, marginBottom: 10 }}
            >
              {a.earned}
            </div>
            <div
              style={{ display: 'flex', gap: 8, marginBottom: 10, justifyContent: 'flex-end' }}
            >
              <RpgButton size="sm">{a.pinned ? '★ pinned' : 'pin'}</RpgButton>
              <RpgButton size="sm">Share</RpgButton>
            </div>
            <RpgButton variant="ghost" size="sm" onClick={onClose}>
              Close
            </RpgButton>
          </div>
        </div>
      </div>
    </div>
  )
}
