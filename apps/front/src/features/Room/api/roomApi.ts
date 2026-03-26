import { apiClient, ListQueryParams, withDefaultListQuery } from '@/shared/api/base';
import { 
  Room, 
  ListRoomsResponse, 
  CreateRoomRequest, 
  UpdateRoomRequest, 
  RoomMediaState, 
  RoomParticipant,
  JoinRoomTokenResponse, 
  UpsertRoomMediaStateRequest 
} from '@/entities/Room/model/types';

type BackendRoom = {
  id?: string;
  title?: string;
  kind?: string;
  description?: string;
  is_private?: boolean;
  isPrivate?: boolean;
  creator_id?: string;
  creatorId?: string;
  creator_name?: string;
  creatorName?: string;
  member_count?: number;
  memberCount?: number;
  is_joined?: boolean;
  isJoined?: boolean;
  is_owner?: boolean;
  isOwner?: boolean;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
  participants?: BackendRoomParticipant[];
  media_state?: BackendRoomMediaState;
  mediaState?: BackendRoomMediaState;
};

type BackendRoomParticipant = {
  user_id?: string;
  userId?: string;
  title?: string;
  avatar_url?: string;
  avatarUrl?: string;
  telegram_username?: string;
  telegramUsername?: string;
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  is_current_user?: boolean;
  isCurrentUser?: boolean;
  joined_at?: string;
  joinedAt?: string;
};

type BackendRoomResponse = {
  room?: BackendRoom;
};

type BackendListRoomsResponse = {
  rooms?: BackendRoom[];
  limit?: number;
  offset?: number;
  total_count?: number;
  totalCount?: number;
  has_next_page?: boolean;
  hasNextPage?: boolean;
};

type BackendRoomMediaState = {
  room_id?: string;
  roomId?: string;
  media_url?: string;
  mediaUrl?: string;
  paused?: boolean;
  current_time_seconds?: number;
  currentTimeSeconds?: number;
  updated_by?: string;
  updatedBy?: string;
  updated_by_name?: string;
  updatedByName?: string;
  updated_at?: string;
  updatedAt?: string;
};

type BackendRoomMediaStateResponse = {
  media_state?: BackendRoomMediaState;
  mediaState?: BackendRoomMediaState;
};

type BackendJoinRoomTokenResponse = {
  access_token?: string;
  accessToken?: string;
  provider?: string;
  server_url?: string;
  serverUrl?: string;
  room?: BackendRoom;
};

function normalizeRoom(room: BackendRoom): Room {
  return {
    id: room.id ?? '',
    title: room.title ?? '',
    kind: room.kind ?? 'voice',
    description: room.description ?? '',
    isPrivate: room.is_private ?? room.isPrivate ?? false,
    creatorId: room.creator_id ?? room.creatorId ?? '',
    creatorName: room.creator_name ?? room.creatorName ?? '',
    memberCount: room.member_count ?? room.memberCount ?? 0,
    isJoined: room.is_joined ?? room.isJoined ?? false,
    isOwner: room.is_owner ?? room.isOwner ?? false,
    createdAt: room.created_at ?? room.createdAt ?? '',
    updatedAt: room.updated_at ?? room.updatedAt ?? '',
    participants: (room.participants ?? []).map(normalizeParticipant),
    mediaState: room.media_state || room.mediaState
      ? normalizeMediaState(room.media_state ?? room.mediaState ?? {})
      : null,
  };
}

function normalizeParticipant(participant: BackendRoomParticipant): RoomParticipant {
  return {
    userId: participant.user_id ?? participant.userId ?? '',
    title: participant.title ?? '',
    avatarUrl: participant.avatar_url ?? participant.avatarUrl ?? '',
    telegramUsername:
      participant.telegram_username ?? participant.telegramUsername ?? '',
    firstName: participant.first_name ?? participant.firstName ?? '',
    lastName: participant.last_name ?? participant.lastName ?? '',
    isCurrentUser:
      participant.is_current_user ?? participant.isCurrentUser ?? false,
    joinedAt: participant.joined_at ?? participant.joinedAt ?? '',
  };
}

function normalizeMediaState(state: BackendRoomMediaState): RoomMediaState {
  return {
    roomId: state.room_id ?? state.roomId ?? '',
    mediaUrl: state.media_url ?? state.mediaUrl ?? '',
    paused: state.paused ?? true,
    currentTimeSeconds:
      state.current_time_seconds ?? state.currentTimeSeconds ?? 0,
    updatedBy: state.updated_by ?? state.updatedBy ?? '',
    updatedByName: state.updated_by_name ?? state.updatedByName ?? '',
    updatedAt: state.updated_at ?? state.updatedAt ?? '',
  };
}

export const roomApi = {
  listRooms: async (params?: ListQueryParams): Promise<ListRoomsResponse> => {
    const response = await apiClient.get<BackendListRoomsResponse>('/api/v1/rooms', {
      params: withDefaultListQuery(params),
    });
    return {
      rooms: (response.data.rooms ?? []).map(normalizeRoom),
      limit: response.data.limit,
      offset: response.data.offset,
      totalCount: response.data.total_count ?? response.data.totalCount,
      hasNextPage: response.data.has_next_page ?? response.data.hasNextPage,
    };
  },

  getRoom: async (roomId: string): Promise<Room> => {
    const response = await apiClient.get<BackendRoomResponse>(`/api/v1/rooms/${roomId}`);
    return normalizeRoom(response.data.room ?? {});
  },

  createRoom: async (payload: CreateRoomRequest): Promise<Room> => {
    const response = await apiClient.post<BackendRoomResponse>('/api/v1/rooms', {
      title: payload.title,
      kind: payload.kind,
      description: payload.description,
      isPrivate: payload.isPrivate,
      mediaUrl: payload.mediaUrl,
    });
    return normalizeRoom(response.data.room ?? {});
  },

  updateRoom: async (roomId: string, payload: UpdateRoomRequest): Promise<Room> => {
    const response = await apiClient.patch<BackendRoomResponse>(`/api/v1/rooms/${roomId}`, {
      title: payload.title,
      description: payload.description,
      isPrivate: payload.isPrivate,
      mediaUrl: payload.mediaUrl,
    });
    return normalizeRoom(response.data.room ?? {});
  },

  deleteRoom: async (roomId: string): Promise<void> => {
    await apiClient.delete(`/api/v1/rooms/${roomId}`);
  },

  joinRoomToken: async (roomId: string): Promise<JoinRoomTokenResponse> => {
    const response = await apiClient.get<BackendJoinRoomTokenResponse>(`/api/v1/rooms/${roomId}/join-token`);
    return {
      accessToken: response.data.access_token ?? response.data.accessToken ?? '',
      provider: response.data.provider ?? '',
      serverUrl: response.data.server_url ?? response.data.serverUrl ?? '',
      room: normalizeRoom(response.data.room ?? {}),
    };
  },

  getRoomMediaState: async (roomId: string): Promise<RoomMediaState> => {
    const response = await apiClient.get<BackendRoomMediaStateResponse>(`/api/v1/rooms/${roomId}/media-state`);
    return normalizeMediaState(
      response.data.media_state ?? response.data.mediaState ?? {},
    );
  },

  upsertRoomMediaState: async (roomId: string, payload: UpsertRoomMediaStateRequest): Promise<RoomMediaState> => {
    const response = await apiClient.put<BackendRoomMediaStateResponse>(`/api/v1/rooms/${roomId}/media-state`, {
      mediaUrl: payload.mediaUrl,
      paused: payload.paused,
      currentTimeSeconds: payload.currentTimeSeconds,
    });
    return normalizeMediaState(
      response.data.media_state ?? response.data.mediaState ?? {},
    );
  },
};
