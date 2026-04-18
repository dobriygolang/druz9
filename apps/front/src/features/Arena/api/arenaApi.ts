import { apiClient } from '@/shared/api/base'
import { createCache } from '@/shared/api/cache'

export interface ArenaStats {
  rating: number
  league: string
  wins: number
  losses: number
  matches: number
  winRate: number
  bestRuntimeMs: number
  peakRating: number
  currentWinStreak: number
  bestWinStreak: number
  leagueRank: number
  leagueTotal: number
  nextLeagueAt: number
}

export interface ArenaLeaderboardEntry {
  userId: string
  displayName: string
  avatarUrl: string
  rating: number
  league: string
  wins: number
  matches: number
  winRate: number
  bestSolveMs: number
}

export interface ArenaSeasonInfo {
  seasonNumber: number
  endsAt: string
  daysLeft: number
}

const statsCache = createCache<string, ArenaStats>({ ttl: 2 * 60_000 })

export const arenaApi = {
  getPlayerStats: async (userId: string): Promise<ArenaStats | null> => {
    const cached = statsCache.get(userId)
    if (cached) return cached
    const inFlight = statsCache.getInFlight(userId)
    if (inFlight) return inFlight
    const req = apiClient.get(`/api/v1/arena/stats/${userId}`)
      .then(r => {
        const s = (r.data as any)?.stats ?? r.data
        if (s && typeof s.rating === 'number') {
          statsCache.set(userId, s as ArenaStats)
          return s as ArenaStats
        }
        return null
      })
      .catch(() => null)
      .finally(() => statsCache.deleteInFlight(userId))
    statsCache.setInFlight(userId, req as Promise<ArenaStats>)
    return req
  },

  getLeaderboard: async (limit = 10): Promise<ArenaLeaderboardEntry[]> => {
    const r = await apiClient.get('/api/v1/arena/leaderboard', { params: { limit } })
    return r.data?.entries ?? r.data?.leaderboard ?? r.data ?? []
  },

  invalidateStats: (userId: string) => {
    statsCache.delete(userId)
  },

  // Guild leaderboard — ranks guilds by aggregate wins + avg rating.
  getGuildsLeaderboard: async (limit = 20): Promise<GuildLeaderboardEntry[]> => {
    const r = await apiClient.get('/api/v1/arena/leaderboard/guilds', { params: { limit } })
    return r.data?.entries ?? []
  },

  // Season XP leaderboard — ranks users by season-pass XP.
  getSeasonXPLeaderboard: async (limit = 50): Promise<{
    entries: SeasonXPEntry[]
    seasonNumber: number
  }> => {
    const r = await apiClient.get('/api/v1/arena/leaderboard/season-xp', { params: { limit } })
    return {
      entries: r.data?.entries ?? [],
      seasonNumber: r.data?.seasonNumber ?? 0,
    }
  },
}

export interface GuildLeaderboardEntry {
  guildId: string
  name: string
  memberCount: number
  totalWins: number
  aggregatePoints: number
  avgRating: number
  deltaWeek: number
}

export interface SeasonXPEntry {
  userId: string
  username: string
  displayName: string
  avatarUrl: string
  guildName: string
  xp: number
  currentTier: number
  trophies: number
}
