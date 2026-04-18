/**
 * RewardToast — single slide-in toast with XP + ember gain.
 * Subscribe to the store's toastQueue and render a stack of these.
 * Auto-dismiss after `ttlMs` via the store's consumeToast action.
 */

import { useEffect } from 'react'
import './game-tokens.css'
import './RewardToast.css'

interface Props {
  id: string
  icon: string
  label: string
  xp: number
  embers: number
  onDismiss: (id: string) => void
  ttlMs?: number
}

export function RewardToast({ id, icon, label, xp, embers, onDismiss, ttlMs = 2600 }: Props) {
  useEffect(() => {
    const t = window.setTimeout(() => onDismiss(id), ttlMs)
    return () => window.clearTimeout(t)
  }, [id, onDismiss, ttlMs])

  return (
    <div className="gm-toast" role="status">
      <span className="gm-toast-icon" aria-hidden="true">{icon}</span>
      <div className="gm-toast-body">
        <div className="gm-toast-label">{label}</div>
        <div className="gm-toast-rewards">
          {xp > 0 && <span className="gm-toast-xp">+{xp} XP</span>}
          {embers > 0 && <span className="gm-toast-embers">+{embers} 🔥</span>}
        </div>
      </div>
    </div>
  )
}
