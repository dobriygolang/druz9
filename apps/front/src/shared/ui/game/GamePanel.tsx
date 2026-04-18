/**
 * GamePanel — parchment section with a carved-wood header bar.
 * Use to group a cohesive set of content on a GamePage.
 *
 *   <GamePanel title="Daily Quests" hint="4 of 4 · ends at midnight">
 *     <QuestScroll ... />
 *   </GamePanel>
 */

import type { ReactNode } from 'react'
import './GamePanel.css'

interface Props {
  title?: string
  hint?: string
  icon?: ReactNode
  children: ReactNode
  /** Set to 'dark' for obsidian panel, default 'parchment'. */
  tone?: 'parchment' | 'dark'
  className?: string
  actions?: ReactNode
}

export function GamePanel({
  title, hint, icon, children, tone = 'parchment', actions, className = '',
}: Props) {
  return (
    <section className={`gm-panel gm-panel-${tone} ${className}`}>
      {(title || icon || actions) && (
        <header className="gm-panel-header">
          <div className="gm-panel-header-main">
            {icon && <span className="gm-panel-header-icon">{icon}</span>}
            {title && (
              <div className="gm-panel-header-text">
                <h2 className="gm-panel-title">{title}</h2>
                {hint && <p className="gm-panel-hint">{hint}</p>}
              </div>
            )}
          </div>
          {actions && <div className="gm-panel-actions">{actions}</div>}
        </header>
      )}
      <div className="gm-panel-body">{children}</div>
    </section>
  )
}
