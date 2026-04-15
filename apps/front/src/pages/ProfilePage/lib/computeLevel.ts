/** Mirrors the backend XP/level formula. */
export function computeUserXP(overview: {
  practiceSessions: number
  practicePassedSessions: number
  completedMockSessions: number
  completedMockStages: number
  currentStreakDays: number
  practiceActiveDays: number
}): number {
  return (
    overview.practiceSessions * 10 +
    overview.practicePassedSessions * 15 +
    overview.completedMockSessions * 50 +
    overview.completedMockStages * 25 +
    overview.currentStreakDays * 5 +
    overview.practiceActiveDays * 8
  )
}

export function computeUserLevel(totalXP: number): { level: number; progress: number } {
  if (totalXP <= 0) return { level: 0, progress: 0 }
  const level = Math.floor(Math.sqrt(totalXP / 10))
  const currentThreshold = level * level * 10
  const nextThreshold = (level + 1) * (level + 1) * 10
  const gap = nextThreshold - currentThreshold
  if (gap <= 0) return { level, progress: 0 }
  const progress = Math.max(0, Math.min(1, (totalXP - currentThreshold) / gap))
  return { level, progress }
}

export function computeLeague(rating: number): string {
  if (rating < 1000) return 'bronze'
  if (rating < 1500) return 'silver'
  if (rating < 2000) return 'gold'
  if (rating < 2500) return 'platinum'
  return 'diamond'
}
