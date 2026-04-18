/**
 * StreakFlame — animated flame SVG that grows/reddens with streak length.
 * 0 days → cold ember. 30+ days → full phoenix flame.
 */

import './game-tokens.css'
import './StreakFlame.css'

interface Props {
  days: number
  size?: number
  showLabel?: boolean
  className?: string
}

function tier(days: number): 'cold' | 'warm' | 'hot' | 'blaze' | 'dragon' {
  if (days <= 0) return 'cold'
  if (days < 7) return 'warm'
  if (days < 30) return 'hot'
  if (days < 100) return 'blaze'
  return 'dragon'
}

const TIER_COLORS: Record<ReturnType<typeof tier>, { outer: string; mid: string; inner: string }> = {
  cold:   { outer: '#6B5030', mid: '#8B6914', inner: '#B48A40' },
  warm:   { outer: '#E8703A', mid: '#FFA340', inner: '#FFD86B' },
  hot:    { outer: '#E8703A', mid: '#FF8A2A', inner: '#FFC830' },
  blaze:  { outer: '#D84030', mid: '#FF6A20', inner: '#FFD050' },
  dragon: { outer: '#A52A2A', mid: '#E8703A', inner: '#FFFFFF' },
}

export function StreakFlame({ days, size = 48, showLabel, className = '' }: Props) {
  const t = tier(days)
  const c = TIER_COLORS[t]
  return (
    <div className={`gm-streak gm-streak-${t} ${className}`}>
      <svg
        viewBox="0 0 40 48"
        width={size}
        height={size * 1.2}
        className="gm-streak-svg"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={`gm-streak-g-${t}`} cx="50%" cy="70%" r="60%">
            <stop offset="0%"  stopColor={c.inner} />
            <stop offset="55%" stopColor={c.mid} />
            <stop offset="100%" stopColor={c.outer} />
          </radialGradient>
        </defs>
        {/* Outer flame */}
        <path
          d="M20 2 C 28 14, 36 22, 34 34 C 32 44, 24 46, 20 46 C 16 46, 8 44, 6 34 C 4 22, 12 14, 20 2 Z"
          fill={`url(#gm-streak-g-${t})`}
        />
        {/* Inner flame */}
        <path
          d="M20 14 C 24 20, 28 26, 26 34 C 25 40, 22 41, 20 41 C 18 41, 15 40, 14 34 C 12 26, 16 20, 20 14 Z"
          fill={c.inner}
          opacity="0.75"
        />
        {/* Tiny core */}
        <ellipse cx="20" cy="34" rx="4" ry="6" fill="#FFF8D0" opacity="0.9" />
      </svg>
      {showLabel && (
        <span className="gm-streak-label">
          <strong>{days}</strong>
          {days === 1 ? ' day' : ' days'}
        </span>
      )}
    </div>
  )
}
