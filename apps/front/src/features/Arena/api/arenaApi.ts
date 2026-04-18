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

// --- Matchmaking (Wave B.3) ---------------------------------------------

export type QueueStatus = 'UNSPECIFIED' | 'WAITING' | 'MATCHED' | 'TIMEOUT' | 'CANCELLED'

// Backend returns status as the proto enum int, but grpc-gateway
// serialises it as the full name. Client uses the name; this helper
// keeps us resilient to either representation.
function normaliseQueueStatus(raw: unknown): QueueStatus {
  if (typeof raw === 'string') {
    if (raw.endsWith('_WAITING')) return 'WAITING'
    if (raw.endsWith('_MATCHED')) return 'MATCHED'
    if (raw.endsWith('_TIMEOUT')) return 'TIMEOUT'
    if (raw.endsWith('_CANCELLED')) return 'CANCELLED'
    return (raw as QueueStatus) ?? 'UNSPECIFIED'
  }
  if (typeof raw === 'number') {
    return (['UNSPECIFIED', 'WAITING', 'MATCHED', 'TIMEOUT', 'CANCELLED'][raw] as QueueStatus) ?? 'UNSPECIFIED'
  }
  return 'UNSPECIFIED'
}

export const arenaMatchmaking = {
  enqueue: async (mode: string): Promise<{ queueId: string; estimatedWaitSeconds: number }> => {
    const r = await apiClient.post<{ queueId?: string; estimatedWaitSeconds?: number }>(
      '/api/v1/arena/queue/enqueue', { mode },
    )
    return { queueId: r.data.queueId ?? '', estimatedWaitSeconds: r.data.estimatedWaitSeconds ?? 0 }
  },
  status: async (queueId: string): Promise<{ status: QueueStatus; matchId: string; waitedSeconds: number }> => {
    const r = await apiClient.get<{ status?: unknown; matchId?: string; waitedSeconds?: number }>(
      `/api/v1/arena/queue/status/${queueId}`,
    )
    return {
      status: normaliseQueueStatus(r.data.status),
      matchId: r.data.matchId ?? '',
      waitedSeconds: r.data.waitedSeconds ?? 0,
    }
  },
  leave: async (queueId: string): Promise<void> => {
    await apiClient.post('/api/v1/arena/queue/leave', { queueId })
  },
}
