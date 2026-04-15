import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '@/app/providers/AuthProvider'
import { authApi } from '@/features/Auth/api/authApi'
import { apiClient } from '@/shared/api/base'
import type { User, ProfileProgress, Achievement, FeedItem } from '@/entities/User/model/types'

export interface ArenaStats {
  rating: number
  league: string
  wins: number
  losses: number
  matches: number
  winRate: number
  peakRating: number
  currentWinStreak: number
  bestWinStreak: number
  leagueRank: number
  leagueTotal: number
  nextLeagueAt: number
}

export interface SectionErrors {
  progress?: boolean
  achievements?: boolean
  activity?: boolean
  arena?: boolean
  feed?: boolean
}

export interface ProfileData {
  user: User | null
  progress: ProfileProgress | null
  achievements: Achievement[]
  activity: { date: string; count: number }[]
  arenaStats: ArenaStats | null
  feed: FeedItem[]
  loading: boolean
  error: string | null
  sectionErrors: SectionErrors
  isOwn: boolean
  refetch: () => void
}

export function useProfileData(targetUserId: string | undefined): ProfileData {
  const { user: authUser } = useAuth()
  const [user, setUser] = useState<User | null>(null)
  const [progress, setProgress] = useState<ProfileProgress | null>(null)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [activity, setActivity] = useState<{ date: string; count: number }[]>([])
  const [arenaStats, setArenaStats] = useState<ArenaStats | null>(null)
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sectionErrors, setSectionErrors] = useState<SectionErrors>({})

  const effectiveId = targetUserId ?? authUser?.id ?? ''
  const isOwn = !targetUserId || targetUserId === authUser?.id

  const authUserRef = useRef(authUser)
  useEffect(() => { authUserRef.current = authUser }, [authUser])

  const fetchAll = useCallback(() => {
    if (!effectiveId) return
    setError(null)
    setSectionErrors({})
    setLoading(true)

    const profileReq = authApi.getProfileById(effectiveId)
      .then(p => setUser(p.user))
      .catch(() => {
        if (authUserRef.current) setUser(authUserRef.current)
        else setError('Failed to load profile')
      })

    const progressReq = authApi.getProfileProgress(effectiveId)
      .then(setProgress)
      .catch(() => { setSectionErrors(prev => ({ ...prev, progress: true })) })

    const achievementsReq = apiClient.get(`/api/v1/profile/${effectiveId}/achievements`)
      .then(res => {
        const raw = res.data
        const arr: any[] = Array.isArray(raw) ? raw : Array.isArray(raw?.achievements) ? raw.achievements : []
        setAchievements(arr.map((a: any, i: number) => ({
          id: a.id ?? a.ID ?? String(i),
          title: a.title ?? a.Title ?? '',
          description: a.description ?? a.Description ?? '',
          icon: a.icon ?? a.Icon ?? '',
          unlocked: a.unlocked ?? a.Unlocked ?? false,
          category: a.category === 'ACHIEVEMENT_CATEGORY_STREAK' ? 'streak' : (a.category ?? a.Category ?? 'practice'),
          tier: a.tier === 'ACHIEVEMENT_TIER_SILVER' ? 'silver'
            : a.tier === 'ACHIEVEMENT_TIER_GOLD' ? 'gold'
            : a.tier === 'ACHIEVEMENT_TIER_DIAMOND' ? 'diamond'
            : (a.tier ?? a.Tier ?? 'bronze'),
          progress: a.progress ?? a.Progress ?? 0,
          target: a.target ?? a.Target ?? 1,
        })))
      })
      .catch(() => { setSectionErrors(prev => ({ ...prev, achievements: true })) })

    const activityReq = apiClient.get(`/api/v1/profile/${effectiveId}/activity`)
      .then(res => {
        const raw = res.data
        const arr: any[] = Array.isArray(raw) ? raw : Array.isArray(raw?.activity) ? raw.activity : []
        setActivity(arr.map((a: any) => ({ date: a.date ?? '', count: a.count ?? 0 })))
      })
      .catch(() => { setSectionErrors(prev => ({ ...prev, activity: true })) })

    const arenaReq = apiClient.get(`/api/v1/arena/stats/${effectiveId}`)
      .then(res => {
        const s = res.data?.stats ?? res.data
        if (s && typeof s.rating === 'number') setArenaStats(s)
      })
      .catch(() => { setSectionErrors(prev => ({ ...prev, arena: true })) })

    const feedReq = authApi.getProfileFeed(effectiveId)
      .then(setFeed)
      .catch(() => { setSectionErrors(prev => ({ ...prev, feed: true })) })

    Promise.all([profileReq, progressReq, achievementsReq, activityReq, arenaReq, feedReq])
      .finally(() => setLoading(false))
  }, [effectiveId])

  useEffect(() => { fetchAll() }, [fetchAll])

  return { user, progress, achievements, activity, arenaStats, feed, loading, error, sectionErrors, isOwn, refetch: fetchAll }
}
