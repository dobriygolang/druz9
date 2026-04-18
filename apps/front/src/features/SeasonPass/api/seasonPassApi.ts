import { apiClient } from '@/shared/api/base'
import {
  RewardKind,
  type GetActiveResponse,
  type ClaimTierRewardResponse,
  type PurchasePremiumResponse,
  type RewardTrack,
  type SeasonPassTier,
} from '../model/types'

// Proto-json serialises enum fields as their full string name
// (e.g. "REWARD_KIND_GOLD").  Map back to the numeric TS enum.
const REWARD_KIND_MAP: Record<string, RewardKind> = {
  REWARD_KIND_UNSPECIFIED: RewardKind.UNSPECIFIED,
  REWARD_KIND_GOLD:        RewardKind.GOLD,
  REWARD_KIND_GEMS:        RewardKind.GEMS,
  REWARD_KIND_XP:          RewardKind.XP,
  REWARD_KIND_FRAME:       RewardKind.FRAME,
  REWARD_KIND_PET:         RewardKind.PET,
  REWARD_KIND_EMOTE:       RewardKind.EMOTE,
  REWARD_KIND_BANNER:      RewardKind.BANNER,
  REWARD_KIND_AURA:        RewardKind.AURA,
  REWARD_KIND_COSMETIC:    RewardKind.COSMETIC,
}

function normalizeKind(raw: unknown): RewardKind {
  if (typeof raw === 'number') return raw as RewardKind
  if (typeof raw === 'string') return REWARD_KIND_MAP[raw] ?? RewardKind.UNSPECIFIED
  return RewardKind.UNSPECIFIED
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeTier(t: any): SeasonPassTier {
  return {
    tier:               t.tier ?? 0,
    freeRewardKind:     normalizeKind(t.freeRewardKind),
    freeRewardAmount:   t.freeRewardAmount ?? 0,
    freeRewardLabel:    t.freeRewardLabel ?? '',
    premiumRewardKind:  normalizeKind(t.premiumRewardKind),
    premiumRewardAmount: t.premiumRewardAmount ?? 0,
    premiumRewardLabel: t.premiumRewardLabel ?? '',
  }
}

export const seasonPassApi = {
  getActive: async (): Promise<GetActiveResponse> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await apiClient.get<any>('/api/v1/season-pass/active')
    return {
      pass: data.pass,
      tiers: (data.tiers ?? []).map(normalizeTier),
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
    return {
      ...data,
      claimedKind: normalizeKind(data.claimedKind),
    }
  },

  purchasePremium: async (): Promise<PurchasePremiumResponse> => {
    const { data } = await apiClient.post<PurchasePremiumResponse>(
      '/api/v1/season-pass/purchase-premium',
      {},
    )
    return data
  },
}
