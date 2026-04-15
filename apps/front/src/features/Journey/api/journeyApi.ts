import { apiClient } from '@/shared/api/base'

export interface ReadinessCompetency {
  key: string
  label: string
  score: number
  practiceScore: number
  verifiedScore: number
  stageCount: number
  questionCount: number
  practiceSessions: number
  practicePassedSessions: number
  practiceDays: number
  confidence: string
  averageScore: number
}

export interface ReadinessNextAction {
  title: string
  description: string
  actionType: string
  actionUrl: string
  skillKey: string
}

export interface CompanyReadiness {
  company: string
  totalStages: number
  completedStages: number
  percent: number
  hasActive: boolean
}

export interface ReadinessResponse {
  score: number
  level: string
  levelLabel: string
  weakestSkill: ReadinessCompetency | null
  strongestSkill: ReadinessCompetency | null
  nextAction: ReadinessNextAction | null
  companyReadiness: CompanyReadiness[]
  streakDays: number
  activeDays: number
}

export const journeyApi = {
  getReadiness: async (userId: string): Promise<ReadinessResponse> => {
    const r = await apiClient.get<ReadinessResponse>(`/api/v1/profile/${userId}/readiness`)
    return r.data
  },
}
