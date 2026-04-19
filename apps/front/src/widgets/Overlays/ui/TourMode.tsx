import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RpgButton } from '@/shared/ui/pixel'

interface TourStep {
  path: string
  title: string
  note: string
  dwell?: number
}

const STEPS: TourStep[] = [
  { path: '/hub',           title: 'Town Square',      note: 'Your daily hub — quests, arena pulse, merchant highlights, season map.' },
  { path: '/training',      title: 'Workshop',         note: 'Skill tree of problems. Nodes unlock as you solve the previous one.' },
  { path: '/arena',         title: 'The Coliseum',     note: '1v1 ELO duels + new 2v2 team mode. Queue time <10s.' },
  { path: '/interview',     title: 'Mentor Tower',     note: 'AI mock interviews across 6 specializations. Readiness score trends per skill.' },
  { path: '/guild',         title: 'Guild Hall',       note: 'Your guild\'s weekly campaign, members, shared rewards.' },
  { path: '/leaderboards',  title: 'The Grand Ledger', note: 'Season rankings. Filters by topic/class, friends-only toggle, your rank always pinned.' },
  { path: '/inbox',         title: 'Inbox',            note: 'Mentor reports, guild notices, duel chat — all in one thread list.' },
  { path: '/shop',          title: 'Merchant of Dusk', note: 'Cosmetics, decor, pets. Rarity borders, hover-peek prices.' },
  { path: '/profile',       title: 'Hero Chamber',     note: 'Your stats, achievements, inventory, pinned duel history.' },
  { path: '/hub',           title: 'End of tour',      note: 'That\'s the pixel-RPG overhaul. Open Tweaks to replay any overlay.', dwell: 5000 },
]

const DEFAULT_DWELL = 3200

interface TourModeProps {
  onEnd: () => void
}

export function TourMode({ onEnd }: TourModeProps) {
  const navigate = useNavigate()
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)

  const step = STEPS[i]

  useEffect(() => {
    navigate(step.path)
  }, [i, step.path, navigate])

  useEffect(() => {
    if (paused) return
    const dwell = step.dwell ?? DEFAULT_DWELL
    const t = setTimeout(() => {
      if (i < STEPS.length - 1) setI((v) => v + 1)
      else onEnd()
    }, dwell)
    return () => clearTimeout(t)
  }, [i, paused, step.dwell, onEnd])

  const next = () => (i < STEPS.length - 1 ? setI(i + 1) : onEnd())
  const prev = () => setI(Math.max(0, i - 1))

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 150,
        width: 'min(560px, calc(100vw - 40px))',
        background: 'var(--parch-0)',
        border: '4px solid var(--ink-0)',
        boxShadow: '6px 6px 0 var(--ink-0)',
        pointerEvents: 'auto',
        animation: 'rpg-toast-in 0.25s ease-out',
      }}
    >
      {/* Progress bar */}
      <div style={{ height: 6, background: 'var(--parch-2)', borderBottom: '2px solid var(--ink-0)' }}>
        <div
          style={{
            height: '100%',
            background: 'var(--ember-1)',
            width: `${((i + 1) / STEPS.length) * 100}%`,
            transition: 'width 0.35s ease-out',
          }}
        />
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div className="font-silkscreen uppercase" style={{ fontSize: 9, color: 'var(--ember-1)', letterSpacing: '0.12em' }}>
            ▶ GUIDED TOUR · step {i + 1} of {STEPS.length}
          </div>
          <button
            onClick={onEnd}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--ink-2)',
              fontFamily: 'Pixelify Sans, Unbounded, monospace',
              fontSize: 14,
              cursor: 'pointer',
            }}
            aria-label="End tour"
          >
            ✕
          </button>
        </div>

        <h3 className="font-display" style={{ fontSize: 20, margin: '0 0 4px' }}>
          {step.title}
        </h3>
        <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 12, lineHeight: 1.5 }}>
          {step.note}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <RpgButton size="sm" variant="ghost" onClick={prev} disabled={i === 0}>
            ← Prev
          </RpgButton>
          <RpgButton size="sm" variant="ghost" onClick={() => setPaused((v) => !v)}>
            {paused ? '▶ Resume' : '❚❚ Pause'}
          </RpgButton>
          <div style={{ flex: 1 }} />
          <RpgButton size="sm" variant="primary" onClick={next}>
            {i === STEPS.length - 1 ? 'Finish ✓' : 'Next →'}
          </RpgButton>
        </div>
      </div>
    </div>
  )
}
