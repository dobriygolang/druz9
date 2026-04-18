/**
 * LevelBadge — hexagonal gold medallion with the player's level.
 * Stardew/Habitica hybrid: SVG hex with radial-gradient fill and runic border.
 */

import './game-tokens.css'
import './LevelBadge.css'

interface Props {
  level: number
  size?: number            // px, default 64
  tier?: 'bronze' | 'silver' | 'gold' | 'dragon'
  label?: string           // override (default: "LV.N")
  className?: string
}

const TIERS: Record<NonNullable<Props['tier']>, [string, string, string]> = {
  bronze:  ['#D8A478', '#B88050', '#8B5A30'],
  silver:  ['#F0F0F0', '#C0C0C8', '#808088'],
  gold:    ['#FFE28A', '#D4A940', '#8B6914'],
  dragon:  ['#FFC0C0', '#E8703A', '#A52A2A'],
}

export function LevelBadge({ level, size = 64, tier, label, className = '' }: Props) {
  const effectiveTier = tier ?? (
    level >= 50 ? 'dragon'
    : level >= 25 ? 'gold'
    : level >= 10 ? 'silver'
    : 'bronze'
  )
  const [c0, c1, c2] = TIERS[effectiveTier]
  const text = label ?? `LV.${level}`
  return (
    <div className={`gm-lvl gm-lvl-${effectiveTier} ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} className="gm-lvl-svg">
        <defs>
          <radialGradient id={`gm-lvl-g-${effectiveTier}`} cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor={c0} />
            <stop offset="55%" stopColor={c1} />
            <stop offset="100%" stopColor={c2} />
          </radialGradient>
        </defs>
        <polygon
          points="50,2 95,27 95,73 50,98 5,73 5,27"
          fill={`url(#gm-lvl-g-${effectiveTier})`}
          stroke="#2A1810"
          strokeWidth="3"
        />
        <polygon
          points="50,10 87,31 87,69 50,90 13,69 13,31"
          fill="none"
          stroke={c0}
          strokeOpacity=".5"
          strokeWidth="1.5"
        />
      </svg>
      <span className="gm-lvl-label" style={{ fontSize: size * 0.22 }}>{text}</span>
    </div>
  )
}
