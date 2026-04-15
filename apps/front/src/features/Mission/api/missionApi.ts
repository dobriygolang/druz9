import { apiClient } from '@/shared/api/base'
import type { DailyMissionsResponse } from '../model/types'

export const missionApi = {
  getDailyMissions: async (): Promise<DailyMissionsResponse> => {
    const { data } = await apiClient.get<DailyMissionsResponse>('/api/v1/missions/daily')
    return {
      missions: data.missions ?? [],
      allComplete: data.allComplete ?? false,
      completedCount: data.completedCount ?? 0,
      bonusXp: data.bonusXp ?? 0,
      totalXpEarned: data.totalXpEarned ?? 0,
    }
  },

  completeMission: async (missionKey: string): Promise<void> => {
    await apiClient.post(`/api/v1/missions/${missionKey}/complete`)
  },
}
