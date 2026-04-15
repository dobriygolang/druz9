export interface Circle {
  id: string
  name: string
  description: string
  creatorId: string
  memberCount: number
  tags: string[]
  isPublic: boolean
  isJoined: boolean
  createdAt: string
}

export interface CircleDayActivity {
  date: string
  dailyCount: number
  duelCount: number
  mockCount: number
}

export interface CircleMemberAction {
  userId: string
  firstName: string
  lastName: string
  avatarUrl: string
  actionType: 'daily' | 'duel' | 'mock'
  actionDetail: string
  happenedAt: string
}

export interface CirclePulse {
  activeToday: number
  totalMembers: number
  weekActivity: CircleDayActivity[]
  recentActions: CircleMemberAction[]
}

export interface ChallengeMemberProgress {
  userId: string
  firstName: string
  lastName: string
  avatarUrl: string
  current: number
}

export interface CircleChallenge {
  id: string
  circleId: string
  templateKey: string
  targetValue: number
  startsAt: string
  endsAt: string
  createdBy: string
  progress: ChallengeMemberProgress[]
}

export interface CircleMemberStats {
  userId: string
  firstName: string
  lastName: string
  avatarUrl: string
  role: string
  joinedAt: string
  dailySolved: number
  duelsWon: number
  duelsPlayed: number
  mocksDone: number
  arenaRating: number
  arenaLeague: string
}
