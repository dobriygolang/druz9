export interface Room {
  id: string;
  title: string;
  kind: string;
  description: string;
  isPrivate: boolean;
  creatorId: string;
  creatorName: string;
  memberCount: number;
  isJoined: boolean;
  isOwner: boolean;
  createdAt: string;
  updatedAt: string;
  participants: RoomParticipant[];
  mediaState: RoomMediaState | null;
}

export interface RoomParticipant {
  userId: string;
  title: string;
  avatarUrl: string;
  telegramUsername: string;
  firstName: string;
  lastName: string;
  isCurrentUser: boolean;
  joinedAt: string;
}

export interface RoomMediaState {
  roomId: string;
  mediaUrl: string;
  paused: boolean;
  currentTimeSeconds: number;
  updatedBy: string;
  updatedByName: string;
  updatedAt: string;
}

export interface ListRoomsResponse {
  rooms: Room[];
  limit?: number;
  offset?: number;
  totalCount?: number;
  hasNextPage?: boolean;
}

export interface CreateRoomRequest {
  title: string;
  kind: string;
  description: string;
  isPrivate?: boolean;
  mediaUrl?: string;
}

export interface UpdateRoomRequest {
  title?: string;
  description?: string;
  isPrivate?: boolean;
  mediaUrl?: string;
}

export interface JoinRoomTokenResponse {
  accessToken: string;
  provider: string;
  serverUrl: string;
  room: Room;
}

export interface UpsertRoomMediaStateRequest {
  mediaUrl?: string;
  paused?: boolean;
  currentTimeSeconds?: number;
}
