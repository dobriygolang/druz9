export enum PresenceStatus {
  UNSPECIFIED = 0,
  ONLINE = 1,
  AWAY = 2,
  OFFLINE = 3,
}

export interface Friend {
  userId: string
  username: string
  displayName: string
  avatarUrl: string
  guildName: string
  presence: PresenceStatus
  lastActivity: string
  lastSeenAt: string
  friendsSince: string
  isFavorite: boolean
}

export interface FriendRequest {
  id: string
  fromUserId: string
  fromUsername: string
  toUserId: string
  message: string
  createdAt: string
}

export interface ListFriendsResponse {
  friends: Friend[]
  total: number
  onlineCount: number
}

export interface ListPendingRequestsResponse {
  incoming: FriendRequest[]
  outgoing: FriendRequest[]
}
