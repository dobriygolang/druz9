/**
 * QuestScroll — parchment row with a quest title, progress, reward chip.
 * Looks like a row on a scroll hung on a cork board. Use in lists.
 */

import './game-tokens.css'
import './QuestScroll.css'

interface Props {
  title: string
  subtitle?: string
  progress: number   // 0..1
  completed?: boolean
  xpReward: number
  emberReward?: number
  icon?: string      // emoji
  onClick?: () => void
  className?: string
}

export function QuestScroll({
  title, subtitle, progress, completed, xpReward, emberReward, icon, onClick, className = '',
}: Props) {
  const Tag = onClick ? 'button' : 'div'
  const pct = Math.round(Math.max(0, Math.min(1, progress)) * 100)
  return (
    <Tag
      className={`gm-quest ${completed ? 'is-done' : ''} ${onClick ? 'gm-quest-clickable' : ''} ${className}`}
      onClick={onClick}
      type={onClick ? 'button' : undefined}
    >
      <div className="gm-quest-check" aria-hidden="true">
        {completed ? '✓' : icon ?? ''}
      </div>

      <div className="gm-quest-text">
        <div className="gm-quest-title">{title}</div>
        {subtitle && <div className="gm-quest-subtitle">{subtitle}</div>}
        {!completed && (
          <div className="gm-quest-progress">
            <div className="gm-quest-progress-track">
              <div className="gm-quest-progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="gm-quest-progress-label">{pct}%</div>
          </div>
        )}
      </div>

      <div className="gm-quest-rewards">
        <div className="gm-quest-reward-chip">+{xpReward} <span>XP</span></div>
        {emberReward != null && emberReward > 0 && (
          <div className="gm-quest-reward-chip gm-quest-reward-ember">
            +{emberReward} <span>🔥</span>
          </div>
        )}
      </div>
    </Tag>
  )
}
