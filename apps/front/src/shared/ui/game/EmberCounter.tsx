/**
 * EmberCounter — gold pill with the player's ember balance.
 * Click → callback (usually opens Shop modal).
 */

import './game-tokens.css'
import './EmberCounter.css'

interface Props {
  embers: number
  onClick?: () => void
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function EmberCounter({ embers, onClick, size = 'md', className = '' }: Props) {
  const Tag = onClick ? 'button' : 'span'
  return (
    <Tag
      className={`gm-embers gm-embers-${size} ${onClick ? 'gm-embers-btn' : ''} ${className}`}
      onClick={onClick}
      type={onClick ? 'button' : undefined}
    >
      <span className="gm-embers-icon" aria-hidden="true">
        {/* Tiny hand-drawn ember SVG */}
        <svg viewBox="0 0 16 16" width="1em" height="1em">
          <defs>
            <radialGradient id="gm-ember-g" cx="50%" cy="60%" r="55%">
              <stop offset="0%" stopColor="#FFE88A" />
              <stop offset="60%" stopColor="#FF8A30" />
              <stop offset="100%" stopColor="#A52A15" />
            </radialGradient>
          </defs>
          <path d="M8 1 C 11 5, 14 9, 13 12 C 13 14, 11 15, 8 15 C 5 15, 3 14, 3 12 C 2 9, 5 5, 8 1 Z" fill="url(#gm-ember-g)" />
          <ellipse cx="8" cy="11" rx="1.8" ry="2.5" fill="#FFF8D0" opacity="0.9" />
        </svg>
      </span>
      <span className="gm-embers-num">{embers.toLocaleString()}</span>
    </Tag>
  )
}
