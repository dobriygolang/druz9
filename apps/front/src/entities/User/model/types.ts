export type UserActivityStatus = 'online' | 'recently_active' | 'offline' | 'unspecified'

export interface User {
  id: string
  username: string
  telegramUsername: string
  firstName: string
  lastName: string
  avatarUrl: string
  region: string
  latitude: number
  longitude: number
  activityStatus: UserActivityStatus
  isAdmin: boolean
  isTrusted: boolean
  currentWorkplace: string
  connectedProviders: string[]
  primaryProvider: string
  createdAt: string
}

export interface ProfileResponse {
  user: User
  needsProfileComplete: boolean
}

export interface CompleteProfilePayload {
  region: string
  country: string
  city: string
  latitude: number
  longitude: number
}

export interface ProfileMockSession {
  id: string
  companyTag: string
  status: 'active' | 'finished' | string
  currentStageIndex: number
  totalStages: number
  currentStageKind: string
}

export interface ProfileProgress {
  overview: {
    practiceSessions: number
    practicePassedSessions: number
    practiceActiveDays: number
    completedMockSessions: number
    completedMockStages: number
    answeredQuestions: number
    averageStageScore: number
    averageQuestionScore: number
    currentStreakDays: number
  }
  competencies: Array<{ name: string; score: number; total: number }>
  strongest: string[]
  weakest: string[]
  recommendations: Array<string | { key?: string; title?: string; description?: string; href?: string }>
  checkpoints: Array<{ title: string; done: boolean }>
  companies: string[]
  mockSessions?: ProfileMockSession[]
}
