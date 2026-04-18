export interface StreakState {
  currentDays: number
  longestDays: number
  shieldsOwned: number
  isBroken: boolean
  canRestore: boolean
  lastActiveAt?: string
  lastShieldUsedAt?: string
  shieldPriceGold: number
}

export interface UseShieldResponse {
  state: StreakState
  restoredToDays: number
}

export interface PurchaseShieldResponse {
  state: StreakState
  purchasedCount: number
  totalCostGold: number
}
