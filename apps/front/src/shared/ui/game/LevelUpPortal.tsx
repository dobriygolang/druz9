/**
 * LevelUpPortal — subscribes to the store's `levelUpOverlay` state and
 * mounts the modal when a level-up happens. Drop once near app root.
 */

import { useGameStore } from '@/shared/lib/gamification/store'
import { LevelUpOverlay } from './LevelUpOverlay'

export function LevelUpPortal() {
  const level = useGameStore(s => s.levelUpOverlay)
  const dismiss = useGameStore(s => s.dismissLevelUp)
  if (level == null) return null
  return <LevelUpOverlay level={level} onDismiss={dismiss} />
}
