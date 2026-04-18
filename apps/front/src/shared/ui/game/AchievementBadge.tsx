/**
 * AchievementBadge — hexagonal badge sized for grid display.
 * Unlocked = full colour, locked = greyscale silhouette with riddle.
 */

import './game-tokens.css'
import './AchievementBadge.css'
import type { Achievement, AchievementRarity } from '@/shared/lib/gamification/achievements'

const RARITY_COLORS: Record<AchievementRarity, { c0: string; c1: string; c2: string; label: string }> = {
  common:    { c0: '#D8A478', c1: '#B88050', c2: '#8B5A30', label: 'Common' },
  rare:      { c0: '#8DC8F0', c1: '#2E5FA0', c2: '#143068', label: 'Rare' },
  epic:      { c0: '#C9A8E8', c1: '#6B3FA0', c2: '#3A1E68', label: 'Epic' },
  legendary: { c0: '#FFE28A', c1: '#D4A940', c2: '#8B6914', label: 'Legendary' },
  dragon:    { c0: '#FFC0C0', c1: '#E8703A', c2: '#A52A2A', label: 'Dragon' },
}

interface Props {
  achievement: Achievement
  unlocked: boolean
  size?: number
  showName?: boolean
  className?: string
}

export function AchievementBadge({ achievement, unlocked, size = 72, showName = true, className = '' }: Props) {
  const { c0, c1, c2, label } = RARITY_COLORS[achievement.rarity]
  const id = `ach-${achievement.id}`
  return (
    <div
      className={`gm-ach gm-ach-${achievement.rarity} ${unlocked ? 'is-unlocked' : 'is-locked'} ${className}`}
      title={unlocked ? `${achievement.name} — ${achievement.description}` : `${label} · Locked — ${achievement.description}`}
    >
      <svg viewBox="0 0 100 100" width={size} height={size} className="gm-ach-svg" aria-hidden="true">
        <defs>
          <radialGradient id={`${id}-g`} cx="50%" cy="35%" r="65%">
            <stop offset="0%"  stopColor={unlocked ? c0 : '#6B6060'} />
            <stop offset="55%" stopColor={unlocked ? c1 : '#4A4242'} />
            <stop offset="100%" stopColor={unlocked ? c2 : '#2A2422'} />
          </radialGradient>
        </defs>
        <polygon
          points="50,2 95,27 95,73 50,98 5,73 5,27"
          fill={`url(#${id}-g)`}
          stroke={unlocked ? '#2A1810' : '#1A1A1A'}
          strokeWidth="3"
        />
        <polygon
          points="50,10 87,31 87,69 50,90 13,69 13,31"
          fill="none"
          stroke={unlocked ? c0 : '#6B6060'}
          strokeOpacity={unlocked ? 0.5 : 0.2}
          strokeWidth="1.5"
        />
      </svg>
      <span className="gm-ach-icon" style={{ fontSize: size * 0.4 }} aria-hidden="true">
        {unlocked ? achievement.icon : '❓'}
      </span>
      {showName && (
        <div className="gm-ach-name">
          {unlocked ? achievement.name : '???'}
        </div>
      )}
    </div>
  )
}
