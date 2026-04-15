import { apiClient } from '@/shared/api/base'
import { createCache } from '@/shared/api/cache'
import type { CompleteProfilePayload, FeedItem, ProfileProgress, ProfileResponse, User, UserGoal } from '@/entities/User/model/types'

type BackendUser = {
  id: string
  username?: string
  telegramUsername?: string
  firstName?: string
  lastName?: string
  avatarUrl?: string
  region?: string
  latitude?: number
  longitude?: number
  activityStatus?: unknown
  isAdmin?: boolean
  isTrusted?: boolean
  createdAt?: string
  currentWorkplace?: string
  connectedProviders?: string[]
  primaryProvider?: string
}

type BackendProfileResponse = {
  user: BackendUser
  needsProfileComplete?: boolean
}

function normalizeActivityStatus(value: unknown): User['activityStatus'] {
  if (value === 1 || value === 'USER_ACTIVITY_STATUS_ONLINE' || value === 'online') return 'online'
  if (value === 2 || value === 'USER_ACTIVITY_STATUS_RECENTLY_ACTIVE') return 'recently_active'
  if (value === 3 || value === 'USER_ACTIVITY_STATUS_OFFLINE') return 'offline'
  return 'unspecified'
}

function normalizeUser(user: BackendUser): User {
  return {
    id: user.id,
    username: user.username ?? '',
    telegramUsername: user.telegramUsername ?? '',
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    avatarUrl: user.avatarUrl ?? '',
    region: user.region ?? '',
    latitude: user.latitude ?? 0,
    longitude: user.longitude ?? 0,
    activityStatus: normalizeActivityStatus(user.activityStatus),
    isAdmin: user.isAdmin ?? false,
    isTrusted: user.isTrusted ?? false,
    currentWorkplace: user.currentWorkplace ?? '',
    connectedProviders: user.connectedProviders ?? [],
    primaryProvider: user.primaryProvider ?? '',
    pinnedAchievements: (user as any).pinnedAchievements ?? [],
    createdAt: user.createdAt ?? '',
  }
}

function normalizeProfileResponse(data: BackendProfileResponse): ProfileResponse {
  return {
    user: normalizeUser(data.user),
    needsProfileComplete: data.needsProfileComplete ?? false,
  }
}

function normalizeGoalKind(value: unknown): UserGoal['kind'] {
  if (value === 'USER_GOAL_KIND_WEAKEST_FIRST' || value === 'weakest_first') return 'weakest_first'
  if (value === 'USER_GOAL_KIND_COMPANY_PREP' || value === 'company_prep') return 'company_prep'
  return 'general_growth'
}

function normalizeActionType(value: unknown): 'practice' | 'mock' | 'daily' | 'duel' | 'checkpoint' | 'arena' | string {
  if (value === 'PROFILE_ACTION_TYPE_MOCK' || value === 'mock') return 'mock'
  if (value === 'PROFILE_ACTION_TYPE_DAILY' || value === 'daily') return 'daily'
  if (value === 'PROFILE_ACTION_TYPE_DUEL' || value === 'duel') return 'duel'
  if (value === 'PROFILE_ACTION_TYPE_CHECKPOINT' || value === 'checkpoint') return 'checkpoint'
  if (value === 'PROFILE_ACTION_TYPE_ARENA' || value === 'arena') return 'arena'
  return 'practice'
}

function normalizeCompetencyConfidence(value: unknown): string {
  if (value === 'PROFILE_COMPETENCY_CONFIDENCE_MEDIUM' || value === 'medium') return 'medium'
  if (value === 'PROFILE_COMPETENCY_CONFIDENCE_VERIFIED' || value === 'verified') return 'verified'
  return 'low'
}

function normalizeCompetencyLevel(value: unknown): 'beginner' | 'confident' | 'strong' | 'expert' {
  if (value === 'PROFILE_COMPETENCY_LEVEL_CONFIDENT' || value === 'confident') return 'confident'
  if (value === 'PROFILE_COMPETENCY_LEVEL_STRONG' || value === 'strong') return 'strong'
  if (value === 'PROFILE_COMPETENCY_LEVEL_EXPERT' || value === 'expert') return 'expert'
  return 'beginner'
}

function normalizeFeedType(value: unknown): 'mock_stage' | 'practice' | string {
  if (value === 'FEED_ITEM_TYPE_PRACTICE' || value === 'practice') return 'practice'
  return 'mock_stage'
}

function goalKindToRequest(kind: string): string {
  if (kind === 'weakest_first') return 'USER_GOAL_KIND_WEAKEST_FIRST'
  if (kind === 'company_prep') return 'USER_GOAL_KIND_COMPANY_PREP'
  return 'USER_GOAL_KIND_GENERAL_GROWTH'
}

function normalizeProfileProgress(progress?: ProfileProgress): ProfileProgress {
  const p = progress ?? {
    overview: {
      practiceSessions: 0,
      practicePassedSessions: 0,
      practiceActiveDays: 0,
      completedMockSessions: 0,
      completedMockStages: 0,
      answeredQuestions: 0,
      averageStageScore: 0,
      averageQuestionScore: 0,
      currentStreakDays: 0,
      level: 0,
      levelProgress: 0,
      totalXp: 0,
      longestStreakDays: 0,
      activityPercentile: 0,
    },
    competencies: [], strongest: [], weakest: [], recommendations: [], checkpoints: [], companies: [],
  }

  return {
    ...p,
    competencies: (p.competencies ?? []).map((c) => ({ ...c, confidence: normalizeCompetencyConfidence(c.confidence), level: normalizeCompetencyLevel(c.level) })),
    strongest: (p.strongest ?? []).map((c) => ({ ...c, confidence: normalizeCompetencyConfidence(c.confidence), level: normalizeCompetencyLevel(c.level) })),
    weakest: (p.weakest ?? []).map((c) => ({ ...c, confidence: normalizeCompetencyConfidence(c.confidence), level: normalizeCompetencyLevel(c.level) })),
    nextActions: (p.nextActions ?? []).map((a) => ({ ...a, actionType: normalizeActionType(a.actionType) })),
    goal: p.goal ? { ...p.goal, kind: normalizeGoalKind(p.goal.kind) } : p.goal,
  }
}

const profileByIdCache = createCache<string, ProfileResponse>({ ttl: 5 * 60_000 })

export function clearProfileByIdCache(userId?: string) {
  if (userId) profileByIdCache.delete(userId)
  else profileByIdCache.clear()
}

export const authApi = {
  createTelegramAuthChallenge: async () => {
    const r = await apiClient.post<{ token: string; botStartUrl?: string; expiresAt?: string }>(
      '/api/v1/profile/auth/telegram/challenge', {},
    )
    return { token: r.data.token, botStartUrl: r.data.botStartUrl ?? '', expiresAt: r.data.expiresAt ?? '' }
  },
  telegramLogin: async (token: string, code: string): Promise<ProfileResponse> => {
    const r = await apiClient.post<BackendProfileResponse>('/api/v1/profile/auth/telegram', { token, code })
    return normalizeProfileResponse(r.data)
  },
  startYandexAuth: async () => {
    const r = await apiClient.get<{ state: string; authUrl?: string; expiresAt?: string }>('/api/v1/profile/auth/yandex/start')
    return { state: r.data.state, authUrl: r.data.authUrl ?? '', expiresAt: r.data.expiresAt ?? '' }
  },
  yandexAuth: async (state: string, code: string): Promise<ProfileResponse> => {
    const r = await apiClient.get<BackendProfileResponse>('/api/v1/profile/auth/yandex/callback', { params: { state, code } })
    return normalizeProfileResponse(r.data)
  },
  bindTelegram: async (token: string, code: string) => {
    await apiClient.post('/api/v1/profile/bind-telegram', { token, code })
  },
  completeRegistration: async (payload: CompleteProfilePayload): Promise<ProfileResponse> => {
    const r = await apiClient.post<BackendProfileResponse>('/api/v1/profile/auth/complete-registration', payload)
    return normalizeProfileResponse(r.data)
  },
  getProfile: async (): Promise<ProfileResponse> => {
    const r = await apiClient.get<BackendProfileResponse>('/api/v1/profile')
    return normalizeProfileResponse(r.data)
  },
  getProfileById: async (userId: string): Promise<ProfileResponse> => {
    const cached = profileByIdCache.get(userId)
    if (cached) return cached
    const inFlight = profileByIdCache.getInFlight(userId)
    if (inFlight) return inFlight
    const req = apiClient.get<BackendProfileResponse>(`/api/v1/profile/${userId}`)
      .then((r) => { const n = normalizeProfileResponse(r.data); profileByIdCache.set(userId, n); return n })
      .finally(() => profileByIdCache.deleteInFlight(userId))
    profileByIdCache.setInFlight(userId, req)
    return req
  },
  getProfileProgress: async (userId: string): Promise<ProfileProgress> => {
    const r = await apiClient.get<{ progress?: ProfileProgress }>(`/api/v1/profile/${userId}/progress`)
    return normalizeProfileProgress(r.data.progress)
  },
  updateLocation: async (payload: CompleteProfilePayload): Promise<ProfileResponse> => {
    const r = await apiClient.post<BackendProfileResponse>('/api/v1/profile/location', payload)
    const normalized = normalizeProfileResponse(r.data)
    profileByIdCache.set(normalized.user.id, normalized)
    return normalized
  },
  updateProfile: async (payload: { currentWorkplace?: string }): Promise<ProfileResponse> => {
    const r = await apiClient.post<BackendProfileResponse>('/api/v1/profile/update', { currentWorkplace: payload.currentWorkplace })
    return normalizeProfileResponse(r.data)
  },
  setUserGoal: async (goal: { kind: string; company?: string }): Promise<UserGoal> => {
    const r = await apiClient.post<{ goal?: UserGoal }>('/api/v1/profile/goal', {
      kind: goalKindToRequest(goal.kind),
      company: goal.company ?? '',
    })
    return r.data.goal ? { ...r.data.goal, kind: normalizeGoalKind(r.data.goal.kind) } : { kind: normalizeGoalKind(goal.kind), company: goal.company ?? '' }
  },
  getProfileFeed: async (userId: string, limit = 7): Promise<FeedItem[]> => {
    const r = await apiClient.get<{ items?: FeedItem[] }>(`/api/v1/profile/${userId}/feed`, { params: { limit } })
    return (r.data.items ?? []).map(item => ({
      type: normalizeFeedType(item.type),
      title: item.title ?? '',
      description: item.description ?? '',
      score: item.score,
      timestamp: item.timestamp ?? '',
    }))
  },
  updatePinnedAchievements: async (userId: string, pinnedAchievements: string[]): Promise<void> => {
    await apiClient.patch(`/api/v1/profile/${userId}`, { pinnedAchievements })
  },
  logout: async () => {
    await apiClient.post('/api/v1/profile/auth/logout', {})
    profileByIdCache.clear()
    localStorage.removeItem('authToken')
  },
}
