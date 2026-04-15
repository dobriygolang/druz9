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

/** @deprecated Use leagueFromEnum — league should come from backend. */
export function computeLeague(rating: number): string {
  if (rating < 500) return 'bronze'
  if (rating < 900) return 'silver'
  if (rating < 1350) return 'gold'
  if (rating < 1800) return 'platinum'
  if (rating < 2250) return 'diamond'
  return 'master'
}

const LEAGUE_ENUM_MAP: Record<string, string> = {
  ARENA_LEAGUE_BRONZE: 'bronze',
  ARENA_LEAGUE_SILVER: 'silver',
  ARENA_LEAGUE_GOLD: 'gold',
  ARENA_LEAGUE_PLATINUM: 'platinum',
  ARENA_LEAGUE_DIAMOND: 'diamond',
  ARENA_LEAGUE_MASTER: 'master',
}

/** Maps the proto enum string (e.g. "ARENA_LEAGUE_GOLD") to a lowercase label. */
export function leagueFromEnum(league?: string): string {
  if (!league) return 'bronze'
  return LEAGUE_ENUM_MAP[league] ?? (league.toLowerCase().replace('arena_league_', '') || 'bronze')
}
