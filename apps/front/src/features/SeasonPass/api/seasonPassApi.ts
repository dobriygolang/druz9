import { apiClient } from '@/shared/api/base'
import type {
  GetActiveResponse,
  ClaimTierRewardResponse,
  PurchasePremiumResponse,
  RewardTrack,
} from '../model/types'

export const seasonPassApi = {
  getActive: async (): Promise<GetActiveResponse> => {
    const { data } = await apiClient.get<GetActiveResponse>('/api/v1/season-pass/active')
    return {
      pass: data.pass,
      tiers: data.tiers ?? [],
      progress: {
        xp: data.progress?.xp ?? 0,
        currentTier: data.progress?.currentTier ?? 0,
        hasPremium: data.progress?.hasPremium ?? false,
        claimedFree: data.progress?.claimedFree ?? [],
        claimedPremium: data.progress?.claimedPremium ?? [],
      },
    }
  },

  claim: async (tier: number, track: RewardTrack): Promise<ClaimTierRewardResponse> => {
    const { data } = await apiClient.post<ClaimTierRewardResponse>(
      '/api/v1/season-pass/claim',
      { tier, track },
    )
    return data
  },

  purchasePremium: async (): Promise<PurchasePremiumResponse> => {
    const { data } = await apiClient.post<PurchasePremiumResponse>(
      '/api/v1/season-pass/purchase-premium',
      {},
    )
    return data
  },
}
