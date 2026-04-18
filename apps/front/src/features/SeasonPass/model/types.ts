export enum RewardKind {
  UNSPECIFIED = 0,
  GOLD = 1,
  GEMS = 2,
  XP = 3,
  FRAME = 4,
  PET = 5,
  EMOTE = 6,
  BANNER = 7,
  AURA = 8,
  COSMETIC = 9,
}

export enum RewardTrack {
  UNSPECIFIED = 0,
  FREE = 1,
  PREMIUM = 2,
}

export interface SeasonPass {
  id: string
  seasonNumber: number
  title: string
  subtitle: string
  startsAt: string
  endsAt: string
  maxTier: number
  xpPerTier: number
  premiumPriceGems: number
}

export interface SeasonPassTier {
  tier: number
  freeRewardKind: RewardKind
  freeRewardAmount: number
  freeRewardLabel: string
  premiumRewardKind: RewardKind
  premiumRewardAmount: number
  premiumRewardLabel: string
}

export interface SeasonPassProgress {
  xp: number
  currentTier: number
  hasPremium: boolean
  claimedFree: number[]
  claimedPremium: number[]
}

export interface GetActiveResponse {
  pass: SeasonPass
  tiers: SeasonPassTier[]
  progress: SeasonPassProgress
}

export interface ClaimTierRewardResponse {
  progress: SeasonPassProgress
  claimedKind: RewardKind
  claimedAmount: number
  claimedLabel: string
}

export interface PurchasePremiumResponse {
  progress: SeasonPassProgress
}
