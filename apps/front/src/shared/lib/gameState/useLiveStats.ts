import { useEffect, useState } from 'react'
import { authApi } from '@/features/Auth/api/authApi'
import { useAuth } from '@/app/providers/AuthProvider'
import type { ProfileProgress } from '@/entities/User/model/types'

export interface LiveStats {
  level: number
  xp: number
  xpMax: number
  xpPct: number
  streak: number
  longestStreak: number
  achievementsEarned: number
  gold: number
  gems: number
  shards: number
  loaded: boolean
}

const DEFAULT: LiveStats = {
  level: 0,
  xp: 0,
  xpMax: 100,
  xpPct: 0,
  streak: 0,
  longestStreak: 0,
  achievementsEarned: 0,
  gold: 0,
  gems: 0,
  shards: 0,
  loaded: false,
}

// XP needed to reach level N. Keeps levelProgress smooth across tiers; any
// mismatch with backend formula is self-correcting because backend drives
// `levelProgress` and `level` directly.
function xpForLevel(level: number): number {
  return 100 + level * 50
}

/**
 * Hero-strip stats, fed by real backend. Returns zeros until first fetch
 * completes so the UI never flashes stale localStorage numbers.
 */
export function useLiveStats(): LiveStats {
  const { user } = useAuth()
  const [stats, setStats] = useState<LiveStats>(DEFAULT)

  useEffect(() => {
    if (!user?.id) {
      setStats(DEFAULT)
      return
    }
    let cancelled = false

    Promise.all([
      authApi.getProfileProgress(user.id).catch(() => null as ProfileProgress | null),
      authApi.getWallet().catch(() => ({ gold: 0, gems: 0, shards: 0 })),
      authApi.getProfileAchievements(user.id).catch(() => []),
    ]).then(([progress, wallet, achievements]) => {
      if (cancelled) return
      const ov = progress?.overview
      const level = ov?.level ?? 0
      const totalXp = ov?.totalXp ?? 0
      const xpMax = xpForLevel(level + 1)
      const xp = totalXp
      const pct = Math.max(0, Math.min(100, Math.round((ov?.levelProgress ?? 0) * 100)))

      setStats({
        level,
        xp,
        xpMax,
        xpPct: pct,
        streak: ov?.currentStreakDays ?? 0,
        longestStreak: ov?.longestStreakDays ?? 0,
        achievementsEarned: achievements.filter((a) => a.progress >= 100).length,
        gold: wallet.gold,
        gems: wallet.gems,
        shards: wallet.shards,
        loaded: true,
      })
    })

    return () => {
      cancelled = true
    }
  }, [user?.id])

  return stats
}
