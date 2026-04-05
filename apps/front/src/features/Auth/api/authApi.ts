import { apiClient } from '@/shared/api/base'
import type { CompleteProfilePayload, ProfileProgress, ProfileResponse, User } from '@/entities/User/model/types'

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
    createdAt: user.createdAt ?? '',
  }
}

function normalizeProfileResponse(data: BackendProfileResponse): ProfileResponse {
  return {
    user: normalizeUser(data.user),
    needsProfileComplete: data.needsProfileComplete ?? false,
  }
}

const profileByIdCache = new Map<string, ProfileResponse>()
const profileByIdPromises = new Map<string, Promise<ProfileResponse>>()

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
    const inFlight = profileByIdPromises.get(userId)
    if (inFlight) return inFlight
    const req = apiClient.get<BackendProfileResponse>(`/api/v1/profile/${userId}`)
      .then((r) => { const n = normalizeProfileResponse(r.data); profileByIdCache.set(userId, n); return n })
      .finally(() => profileByIdPromises.delete(userId))
    profileByIdPromises.set(userId, req)
    return req
  },
  getProfileProgress: async (userId: string): Promise<ProfileProgress> => {
    const r = await apiClient.get<{ progress?: ProfileProgress }>(`/api/v1/profile/${userId}/progress`)
    return r.data.progress ?? {
      overview: { practiceSessions: 0, practicePassedSessions: 0, practiceActiveDays: 0, completedMockSessions: 0, completedMockStages: 0, answeredQuestions: 0, averageStageScore: 0, averageQuestionScore: 0, currentStreakDays: 0 },
      competencies: [], strongest: [], weakest: [], recommendations: [], checkpoints: [], companies: [],
    }
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
  logout: async () => {
    await apiClient.post('/api/v1/profile/auth/logout', {})
    profileByIdCache.clear()
    profileByIdPromises.clear()
    localStorage.removeItem('authToken')
  },
}
