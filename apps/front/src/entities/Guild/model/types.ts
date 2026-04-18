export interface Guild {
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

export interface GuildDayActivity {
  date: string
  dailyCount: number
  duelCount: number
  mockCount: number
}

export interface GuildMemberAction {
  userId: string
  firstName: string
  lastName: string
  avatarUrl: string
  actionType: 'daily' | 'duel' | 'mock'
  actionDetail: string
  happenedAt: string
}

export interface GuildPulse {
  activeToday: number
  totalMembers: number
  weekActivity: GuildDayActivity[]
  recentActions: GuildMemberAction[]
}

export interface ChallengeMemberProgress {
  userId: string
  firstName: string
  lastName: string
  avatarUrl: string
  current: number
}

export interface GuildChallenge {
  id: string
  guildId: string
  templateKey: string
  targetValue: number
  startsAt: string
  endsAt: string
  createdBy: string
  progress: ChallengeMemberProgress[]
}

export interface GuildMemberStats {
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
