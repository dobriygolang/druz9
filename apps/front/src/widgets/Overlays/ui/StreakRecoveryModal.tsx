import { useEffect } from 'react'
import { RpgButton, Badge } from '@/shared/ui/pixel'
import { play } from '@/shared/lib/sound'

interface StreakRecoveryModalProps {
  streakBefore: number
  onUseShield: () => void
  onDismiss: () => void
}

export function StreakRecoveryModal({ streakBefore, onUseShield, onDismiss }: StreakRecoveryModalProps) {
  useEffect(() => { play('streakBreak') }, [])
  return (
    <div className="rpg-modal-backdrop" onClick={onDismiss}>
      <div
        className="rpg-modal rpg-panel rpg-panel--nailed"
        style={{ padding: 32, maxWidth: 440, textAlign: 'center' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Broken fire icon */}
        <div style={{ fontSize: 52, lineHeight: 1, marginBottom: 8 }}>🔥</div>
        <div
          className="font-silkscreen uppercase"
          style={{ color: 'var(--rpg-danger)', fontSize: 10, letterSpacing: '0.1em', marginBottom: 6 }}
        >
          STREAK BROKEN
        </div>
        <h2 className="font-display" style={{ whiteSpace: 'normal', fontSize: 26, margin: '0 0 8px' }}>
          {streakBefore}-day streak lost
        </h2>
        <div style={{ color: 'var(--ink-2)', fontSize: 13, marginBottom: 20 }}>
          You missed yesterday. Your {streakBefore}-day flame is extinguished — but a Streak Shield can restore it.
        </div>

        {/* Stats comparison */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          <div style={{ background: 'var(--parch-2)', border: '2px solid var(--ink-0)', padding: 12 }}>
            <div className="font-silkscreen uppercase" style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em' }}>WAS</div>
            <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 32, color: 'var(--ember-1)', lineHeight: 1 }}>
              {streakBefore}d
            </div>
            <div className="font-silkscreen" style={{ fontSize: 9, color: 'var(--ember-1)' }}>🔥 streak</div>
          </div>
          <div style={{ background: 'var(--parch-2)', border: '2px dashed var(--rpg-danger)', padding: 12 }}>
            <div className="font-silkscreen uppercase" style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em' }}>NOW</div>
            <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 32, color: 'var(--rpg-danger)', lineHeight: 1 }}>
              0d
            </div>
            <div className="font-silkscreen" style={{ fontSize: 9, color: 'var(--ink-3)' }}>streak reset</div>
          </div>
        </div>

        {/* Shield option */}
        <div
          style={{
            background: 'var(--parch-2)',
            border: '3px solid var(--ember-1)',
            boxShadow: '3px 3px 0 var(--ember-1)',
            padding: 14,
            marginBottom: 16,
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 15 }}>⛨ Streak Shield</div>
            <Badge variant="ember">1 owned</Badge>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 10 }}>
            Restores your {streakBefore}-day streak as if yesterday never happened. One use.
          </div>
          <RpgButton variant="primary" style={{ width: '100%' }} onClick={onUseShield}>
            Use shield — restore {streakBefore}d streak
          </RpgButton>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <RpgButton size="sm" variant="ghost" onClick={onDismiss}>
            Accept the loss
          </RpgButton>
          <RpgButton size="sm" onClick={onDismiss}>
            Buy shield (200 💰)
          </RpgButton>
        </div>
      </div>
    </div>
  )
}
