/**
 * GamePage — background + layout shell for any non-fullscreen route.
 *
 * Slim by design — the global GameTopBar already shows the active
 * section and handles navigation, so this page-level wrapper no longer
 * renders a huge hero title. Use <h1> inside your content if you need
 * a local heading (or leave it out entirely).
 *
 * Props kept (title/subtitle/heroIcon) are rendered as a compact inline
 * intro section, not a hero. Callers can omit them to go chrome-less.
 */

import type { ReactNode } from 'react'
import { DragonSilhouette } from './DragonSilhouette'
import './GamePage.css'

interface Props {
  /** Optional section title (inline — not a hero). */
  title?: string
  subtitle?: string
  heroIcon?: ReactNode
  /** Right-aligned controls in the intro row. */
  headerExtra?: ReactNode
  children: ReactNode
  /** Decorative dragon silhouettes in the corners. */
  showDragons?: boolean
  className?: string
}

export function GamePage({
  title, subtitle, heroIcon, headerExtra,
  children, showDragons = false, className = '',
}: Props) {
  const hasIntro = Boolean(title || subtitle || headerExtra || heroIcon)

  return (
    <div className={`gm-page ${className}`}>
      {showDragons && (
        <>
          <DragonSilhouette variant="coiled" size={320} opacity={0.035}
                            className="gm-page-dragon gm-page-dragon-tl" />
          <DragonSilhouette variant="flying" size={220} opacity={0.04} flip
                            className="gm-page-dragon gm-page-dragon-br" />
        </>
      )}

      <div className="gm-page-inner">
        {hasIntro && (
          <header className="gm-page-intro">
            <div className="gm-page-intro-main">
              {heroIcon && <div className="gm-page-intro-icon">{heroIcon}</div>}
              {(title || subtitle) && (
                <div className="gm-page-intro-text">
                  {title && <h1 className="gm-page-title">{title}</h1>}
                  {subtitle && <p className="gm-page-subtitle">{subtitle}</p>}
                </div>
              )}
            </div>
            {headerExtra && <div className="gm-page-intro-extra">{headerExtra}</div>}
          </header>
        )}

        <div className="gm-page-body">{children}</div>
      </div>
    </div>
  )
}
