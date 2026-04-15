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
}
