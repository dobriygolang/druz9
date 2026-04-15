export interface DailyMission {
  key: string
  title: string
  description: string
  targetValue: number
  current: number
  completed: boolean
  xpReward: number
  actionUrl: string
  icon: string
}

export interface DailyMissionsResponse {
  missions: DailyMission[]
  allComplete: boolean
  completedCount: number
  bonusXp: number
  totalXpEarned: number
}
