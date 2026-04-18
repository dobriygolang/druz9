/**
 * TaskRow — dense list row used on every hub/sub-hub page.
 *
 * Replaces the old 2x2 "tile grid" (<ActionCard/>) with a Habitica-style
 * vertical list of actions:
 *
 *   ┌ [icon]  Title                    badge  →
 *   │         hint / subtitle
 *
 * Clickable as a <Link> (if `to`) or <button> (if `onClick`). Hover
 * tints with the row's --task-accent colour.
 */

import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import './TaskRow.css'

interface Props {
  /** Leading icon — a Lucide component or emoji string. */
  icon?: ReactNode
  /** Emoji alternative if no Lucide icon. */
  emoji?: string
  title: string
  hint?: string
  /** Navigate here on click. */
  to?: string
  /** Or run this function. If neither `to` nor `onClick`, row is display-only. */
  onClick?: () => void
  /** Optional badge on the right (e.g. "+50 XP", "Ranked", "3 new"). */
  badge?: ReactNode
  /** Accent colour (hex). Default: gold. */
  accent?: string
  /** Hide the trailing arrow. */
  noArrow?: boolean
  /** Disabled/locked state — greyed out, not clickable. */
  disabled?: boolean
  className?: string
}

export function TaskRow({
  icon, emoji, title, hint, to, onClick, badge,
  accent = '#D4A940', noArrow = false, disabled = false,
  className = '',
}: Props) {
  const style = { ['--task-accent' as string]: accent } as React.CSSProperties
  const cls = `gm-task ${disabled ? 'is-disabled' : ''} ${className}`

  const inner = (
    <>
      <span className="gm-task-icon" aria-hidden="true">
        {icon ?? (emoji ? <span className="gm-task-emoji">{emoji}</span> : null)}
      </span>

      <span className="gm-task-main">
        <span className="gm-task-title">{title}</span>
        {hint && <span className="gm-task-hint">{hint}</span>}
      </span>

      {badge && <span className="gm-task-badge">{badge}</span>}
      {!noArrow && (to || onClick) && !disabled && (
        <ArrowRight className="gm-task-arrow" aria-hidden="true" />
      )}
    </>
  )

  if (to && !disabled) {
    return (
      <Link to={to} className={cls} style={style}>
        {inner}
      </Link>
    )
  }
  if (onClick && !disabled) {
    return (
      <button type="button" onClick={onClick} className={cls} style={style}>
        {inner}
      </button>
    )
  }
  return (
    <div className={cls} style={style}>
      {inner}
    </div>
  )
}
