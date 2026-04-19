import { useEffect } from 'react'
import { RpgButton, Badge } from '@/shared/ui/pixel'
import { Trophy, Banner, Fireflies } from '@/shared/ui/sprites'
import { play } from '@/shared/lib/sound'

interface SeasonCompleteModalProps {
  seasonNumber: number
  seasonName: string
  finalRank: number
  totalPlayers: number
  percentile: number
  xpEarned: number
  goldEarned: number
  trophiesEarned: number
  onClose: () => void
}

export function SeasonCompleteModal({
  seasonNumber,
  seasonName,
  finalRank,
  totalPlayers,
  percentile,
  xpEarned,
  goldEarned,
  trophiesEarned,
  onClose,
}: SeasonCompleteModalProps) {
  useEffect(() => { play('seasonComplete') }, [])

  const confetti = Array.from({ length: 40 }).map((_, i) => ({
    x: Math.random() * 100,
    delay: Math.random() * 1.2,
    dur: 2.4 + Math.random() * 1.6,
    c: ['var(--ember-1)', 'var(--moss-1)', 'var(--r-legendary)', 'var(--r-epic)', 'var(--r-rare)'][i % 5],
    r: Math.random() * 360,
    w: 8 + Math.random() * 6,
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
            width: p.w,
            height: p.w + 4,
            background: p.c,
            border: '2px solid var(--ink-0)',
            animation: `rpg-confetti-fall ${p.dur}s ${p.delay}s linear infinite`,
            transform: `rotate(${p.r}deg)`,
          }}
        />
      ))}
      <div
        className="rpg-modal rpg-panel rpg-panel--nailed"
        style={{ padding: 36, maxWidth: 560, textAlign: 'center', position: 'relative' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="font-silkscreen uppercase"
          style={{ color: 'var(--r-legendary)', marginBottom: 6, letterSpacing: '0.12em', fontSize: 11 }}
        >
          · SEASON {seasonNumber} · COMPLETE ·
        </div>
        <h2
          className="font-display"
          style={{ fontSize: 30, margin: '6px 0 4px', whiteSpace: 'normal' }}
        >
          {seasonName}
        </h2>
        <div className="font-silkscreen uppercase" style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.1em', marginBottom: 18 }}>
          chronicles sealed
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, marginBottom: 20, position: 'relative' }}>
          <Trophy scale={4} tier="gold" />
          <Fireflies count={8} />
          <Banner scale={2} color="#a97f4c" crest="✦" />
        </div>

        {/* Rank */}
        <div
          style={{
            background: 'var(--parch-2)',
            border: '3px solid var(--ink-0)',
            boxShadow: '3px 3px 0 var(--ink-0)',
            padding: 16,
            marginBottom: 14,
          }}
        >
          <div className="font-silkscreen uppercase" style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.1em', marginBottom: 4 }}>
            final rank
          </div>
          <div style={{ fontFamily: 'Pixelify Sans, Unbounded, monospace', fontSize: 44, color: 'var(--ember-1)', lineHeight: 1 }}>
            #{finalRank}
          </div>
          <div className="font-silkscreen uppercase" style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.08em', marginTop: 4 }}>
            of {totalPlayers.toLocaleString()} · top {percentile}%
          </div>
        </div>

        {/* Rewards grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
          <RewardTile label="XP" value={`+${xpEarned.toLocaleString()}`} color="var(--moss-1)" />
          <RewardTile label="Gold" value={`+${goldEarned.toLocaleString()}`} color="var(--ember-1)" />
          <RewardTile label="Trophies" value={`+${trophiesEarned}`} color="var(--r-legendary)" />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 18 }}>
          <Badge variant="ember">legendary frame · Ember Sovereign</Badge>
          <Badge variant="dark">title: Seasonkeeper</Badge>
          <Badge variant="moss">hall banner unlocked</Badge>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <RpgButton size="sm" variant="ghost" onClick={onClose}>
            View chronicle
          </RpgButton>
          <RpgButton size="sm" variant="primary" onClick={onClose}>
            Claim rewards
          </RpgButton>
        </div>
      </div>
    </div>
  )
}

function RewardTile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rpg-stat-box" style={{ textAlign: 'center' }}>
      <div className="font-silkscreen uppercase" style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'Pixelify Sans, Unbounded, monospace', fontSize: 22, color, lineHeight: 1.1 }}>
        {value}
      </div>
    </div>
  )
}
