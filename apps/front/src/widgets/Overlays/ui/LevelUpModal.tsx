import { useEffect } from 'react'
import { RpgButton, Badge } from '@/shared/ui/pixel'
import { Hero, Fireflies } from '@/shared/ui/sprites'
import { play } from '@/shared/lib/sound'

export function LevelUpModal({
  open,
  level,
  onClose,
}: {
  open: boolean
  level: number
  onClose: () => void
}) {
  useEffect(() => {
    if (open) play('levelUp')
  }, [open])
  if (!open) return null
  const confetti = Array.from({ length: 24 }).map((_, i) => ({
    x: Math.random() * 100,
    delay: Math.random() * 0.6,
    dur: 2 + Math.random() * 1.4,
    c: ['var(--ember-1)', 'var(--moss-1)', 'var(--r-legendary)', 'var(--r-epic)'][i % 4],
    r: Math.random() * 360,
  }))
  return (
    <div className="rpg-modal-backdrop" onClick={onClose}>
      {confetti.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: -20,
            width: 10,
            height: 14,
            background: p.c,
            border: '2px solid var(--ink-0)',
            animation: `rpg-confetti-fall ${p.dur}s ${p.delay}s linear infinite`,
            transform: `rotate(${p.r}deg)`,
          }}
        />
      ))}
      <div
        className="rpg-modal rpg-panel rpg-panel--nailed"
        style={{
          padding: 40,
          maxWidth: 520,
          textAlign: 'center',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="font-silkscreen uppercase"
          style={{ color: 'var(--ember-1)', marginBottom: 10, letterSpacing: '0.1em' }}
        >
          LEVEL UP
        </div>
        <div
          style={{
            fontFamily: 'Pixelify Sans, Unbounded, monospace',
            fontSize: 88,
            color: 'var(--ember-1)',
            lineHeight: 1,
            textShadow: '6px 6px 0 var(--ink-0)',
          }}
        >
          {level}
        </div>
        <h2
          className="font-display"
          style={{ whiteSpace: 'normal', margin: '14px 0 6px', fontSize: 22 }}
        >
          Knight of Ember
        </h2>
        <div style={{ color: 'var(--ink-2)', marginBottom: 18 }}>
          A new title opens. New emblems, backdrop and +1 guild slot unlocked.
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            marginBottom: 18,
            position: 'relative',
          }}
        >
          <Hero scale={5} pose="trophy" />
          <Fireflies count={10} />
        </div>
        <div
          style={{
            display: 'flex',
            gap: 8,
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: 18,
          }}
        >
          <Badge variant="ember">+500 gold</Badge>
          <Badge variant="ember">+1 guild slot</Badge>
          <Badge variant="ember">new frame · ember</Badge>
          <Badge variant="dark">title: Knight of Ember</Badge>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <RpgButton size="sm" onClick={onClose}>
            Later
          </RpgButton>
          <RpgButton size="sm" variant="primary" onClick={onClose}>
            Claim rewards
          </RpgButton>
        </div>
      </div>
    </div>
  )
}
