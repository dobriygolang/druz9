export interface Circle {
  id: string
  name: string
  description: string
  memberCount: number
  tags: string[]
  isJoined: boolean
  creatorId: string
  createdAt: string
  avatarUrl?: string
}
