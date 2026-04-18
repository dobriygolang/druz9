/**
 * LevelUpOverlay — full-screen modal: golden rays, dragon coiled around
 * the new level number. Auto-dismisses after N seconds or on click.
 */

import { useEffect } from 'react'
import './game-tokens.css'
import './LevelUpOverlay.css'

interface Props {
  level: number
  onDismiss: () => void
  autoDismissMs?: number
}

export function LevelUpOverlay({ level, onDismiss, autoDismissMs = 4500 }: Props) {
  useEffect(() => {
    const id = window.setTimeout(onDismiss, autoDismissMs)
    return () => window.clearTimeout(id)
  }, [onDismiss, autoDismissMs])

  return (
    <div className="gm-lvlup" onClick={onDismiss} role="dialog" aria-modal="true">
      <div className="gm-lvlup-rays" aria-hidden="true">
        <svg viewBox="0 0 600 600" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="gm-rays-core" cx="50%" cy="50%" r="40%">
              <stop offset="0%"  stopColor="#FFF8D0" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#FFD060" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#8B6914" stopOpacity="0" />
            </radialGradient>
          </defs>
          {Array.from({ length: 12 }).map((_, i) => (
            <polygon
              key={i}
              points="300,300 280,-200 320,-200"
              fill="rgba(255, 210, 100, 0.15)"
              transform={`rotate(${i * 30} 300 300)`}
            />
          ))}
          <circle cx="300" cy="300" r="280" fill="url(#gm-rays-core)" />
        </svg>
      </div>

      <div className="gm-lvlup-card" onClick={(e) => e.stopPropagation()}>
        {/* Dragon coiled around — SVG decoration */}
        <svg viewBox="0 0 300 300" className="gm-lvlup-dragon" aria-hidden="true">
          <path
            d="M 40 150 Q 30 100 70 80 Q 120 70 150 100 Q 180 120 200 90 Q 230 50 260 80
               Q 280 110 260 150 Q 280 190 260 220 Q 230 250 200 210 Q 180 180 150 200
               Q 120 230 70 220 Q 30 200 40 150 Z"
            fill="none"
            stroke="#A52A2A"
            strokeWidth="2"
            strokeLinejoin="round"
            opacity="0.6"
          />
          <circle cx="260" cy="80" r="4" fill="#FFE28A" />
          <path d="M 258 77 L 263 73 L 270 78 L 265 82 Z" fill="#A52A2A" opacity="0.8" />
        </svg>

        <div className="gm-lvlup-label">LEVEL UP</div>
        <div className="gm-lvlup-num">{level}</div>
        <div className="gm-lvlup-sub">You grow stronger, adventurer.</div>

        <button className="gm-lvlup-btn" onClick={onDismiss} type="button">
          Continue
        </button>
      </div>
    </div>
  )
}
