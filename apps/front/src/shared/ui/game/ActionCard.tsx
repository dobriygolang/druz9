/**
 * ActionCard — the click-able parchment card used on every hub page.
 *
 *   <ActionCard
 *     to="/practice/arena"
 *     emoji="⚔"
 *     title="Arena"
 *     description="1v1 code duels — climb the leaderboard."
 *     accentColor="#A52A2A"
 *     stats={<>42 wins · 68% rate</>}
 *   />
 *
 * Cards auto-hover lift + glow. Use `image` prop when the artist
 * provides a PNG illustration for the top half of the card.
 */

import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import './ActionCard.css'

interface Props {
  /** Destination route. If `onClick` given, link is not rendered. */
  to?: string
  onClick?: () => void
  /** Big emoji fallback if no illustration yet. */
  emoji?: string
  /** Optional PNG illustration URL for the top half. */
  image?: string
  title: string
  description: string
  /** Accent colour for the border glow (hex). */
  accentColor?: string
  /** Optional stat line under description. */
  stats?: ReactNode
  /** Shown as a little ribbon/badge top-right (e.g. "3 new"). */
  badge?: string
  /** Lock state — grays out & disables. */
  disabled?: boolean
  className?: string
}

export function ActionCard({
  to, onClick, emoji, image, title, description,
  accentColor = '#D4A940', stats, badge, disabled, className = '',
}: Props) {
  const Wrap = to && !disabled
    ? ({ children }: { children: ReactNode }) =>
        <Link to={to} className="ac-link">{children}</Link>
    : onClick && !disabled
      ? ({ children }: { children: ReactNode }) =>
          <button onClick={onClick} className="ac-link ac-link-btn" type="button">{children}</button>
      : ({ children }: { children: ReactNode }) => <div className="ac-link ac-link-disabled">{children}</div>

  return (
    <Wrap>
      <article
        className={`ac ${disabled ? 'is-disabled' : ''} ${className}`}
        style={{ '--ac-accent': accentColor } as React.CSSProperties}
      >
        {badge && <span className="ac-badge">{badge}</span>}

        <div className="ac-art">
          {image ? (
            <img src={image} alt="" className="ac-art-img" draggable={false} />
          ) : (
            <div className="ac-art-emoji" aria-hidden="true">{emoji ?? '✦'}</div>
          )}
          <div className="ac-art-glow" aria-hidden="true" />
        </div>

        <div className="ac-body">
          <h3 className="ac-title">{title}</h3>
          <p className="ac-desc">{description}</p>
          {stats && <div className="ac-stats">{stats}</div>}
        </div>

        {!disabled && (
          <div className="ac-cta" aria-hidden="true">
            <span>Enter</span>
            <span className="ac-cta-arrow">→</span>
          </div>
        )}
      </article>
    </Wrap>
  )
}
