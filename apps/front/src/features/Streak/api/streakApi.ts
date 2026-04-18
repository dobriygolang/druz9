import { apiClient } from '@/shared/api/base'
import type { StreakState, UseShieldResponse, PurchaseShieldResponse } from '../model/types'

export const streakApi = {
  getStreak: async (): Promise<StreakState> => {
    const { data } = await apiClient.get<{ state: StreakState }>('/api/v1/streak')
    return normalise(data.state)
  },

  useShield: async (): Promise<UseShieldResponse> => {
    const { data } = await apiClient.post<UseShieldResponse>('/api/v1/streak/shield/use', {})
    return { state: normalise(data.state), restoredToDays: data.restoredToDays ?? 0 }
  },

  purchaseShield: async (count = 1): Promise<PurchaseShieldResponse> => {
    const { data } = await apiClient.post<PurchaseShieldResponse>('/api/v1/streak/shield/purchase', { count })
    return {
      state: normalise(data.state),
      purchasedCount: data.purchasedCount ?? 0,
      totalCostGold: data.totalCostGold ?? 0,
    }
  },
}

function normalise(s: StreakState | undefined): StreakState {
  return {
    currentDays: s?.currentDays ?? 0,
    longestDays: s?.longestDays ?? 0,
    shieldsOwned: s?.shieldsOwned ?? 0,
    isBroken: s?.isBroken ?? false,
    canRestore: s?.canRestore ?? false,
    lastActiveAt: s?.lastActiveAt,
    lastShieldUsedAt: s?.lastShieldUsedAt,
    shieldPriceGold: s?.shieldPriceGold ?? 200,
  }
}
