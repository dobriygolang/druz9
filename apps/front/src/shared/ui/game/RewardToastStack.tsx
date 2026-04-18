/**
 * RewardToastStack — top-right vertical stack of `<RewardToast />`.
 * Subscribes to the game store's `toastQueue` and renders them all.
 * Drop this once near the app root (e.g. inside PageLayout).
 */

import { useGameStore } from '@/shared/lib/gamification/store'
import { RewardToast } from './RewardToast'
import './RewardToastStack.css'

export function RewardToastStack() {
  const toasts = useGameStore(s => s.toastQueue)
  const consume = useGameStore(s => s.consumeToast)

  if (toasts.length === 0) return null

  return (
    <div className="gm-toast-stack" aria-live="polite" aria-atomic="false">
      {toasts.map(t => (
        <RewardToast
          key={t.id}
          id={t.id}
          icon={t.icon}
          label={t.label}
          xp={t.xp}
          embers={t.embers}
          onDismiss={consume}
        />
      ))}
    </div>
  )
}
