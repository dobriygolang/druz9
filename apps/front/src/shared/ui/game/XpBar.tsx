/**
 * XpBar — horizontal progress bar, gold-on-night parchment style.
 * Pass `progress` (0..1) or `xp`/`max` to compute it. Optional label.
 */

import './game-tokens.css'
import './XpBar.css'

interface Props {
  /** 0..1 normalized progress. Overridden by xp/max if both provided. */
  progress?: number
  xp?: number
  max?: number
  label?: string
  /** Thin version for inline places. */
  compact?: boolean
  className?: string
}

export function XpBar({ progress, xp, max, label, compact, className = '' }: Props) {
  const p = xp != null && max != null && max > 0
    ? Math.max(0, Math.min(1, xp / max))
    : Math.max(0, Math.min(1, progress ?? 0))
  return (
    <div className={`gm-xp ${compact ? 'gm-xp-compact' : ''} ${className}`}>
      {label && <div className="gm-xp-label">{label}</div>}
      <div className="gm-xp-track" role="progressbar" aria-valuenow={Math.round(p * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div className="gm-xp-fill" style={{ width: `${p * 100}%` }} />
        <div className="gm-xp-shine" />
      </div>
      {xp != null && max != null && (
        <div className="gm-xp-nums">{xp.toLocaleString()} / {max.toLocaleString()}</div>
      )}
    </div>
  )
}
