import { apiClient } from '@/shared/api/base'
import type {
  Friend,
  FriendRequest,
  ListFriendsResponse,
  ListPendingRequestsResponse,
  UserHit,
} from '../model/types'

export const socialApi = {
  listFriends: async (params?: { limit?: number; offset?: number }): Promise<ListFriendsResponse> => {
    const { data } = await apiClient.get<ListFriendsResponse>('/api/v1/social/friends', {
      params: { limit: params?.limit ?? 50, offset: params?.offset ?? 0 },
    })
    return {
      friends: data.friends ?? [],
      total: data.total ?? 0,
      onlineCount: data.onlineCount ?? 0,
    }
  },

  listPendingRequests: async (): Promise<ListPendingRequestsResponse> => {
    const { data } = await apiClient.get<ListPendingRequestsResponse>('/api/v1/social/requests')
    return { incoming: data.incoming ?? [], outgoing: data.outgoing ?? [] }
  },

  sendRequest: async (toUsername: string, message = ''): Promise<FriendRequest> => {
    const { data } = await apiClient.post<{ request: FriendRequest }>('/api/v1/social/requests', {
      toUsername,
      message,
    })
    return data.request
  },

  acceptRequest: async (requestId: string): Promise<Friend> => {
    const { data } = await apiClient.post<{ friend: Friend }>(`/api/v1/social/requests/${requestId}/accept`, {})
    return data.friend
  },

  declineRequest: async (requestId: string): Promise<void> => {
    await apiClient.post(`/api/v1/social/requests/${requestId}/decline`, {})
  },

  removeFriend: async (userId: string): Promise<void> => {
    await apiClient.post(`/api/v1/social/friends/${userId}/remove`, {})
  },

  searchUsers: async (query: string, limit = 10): Promise<UserHit[]> => {
    const { data } = await apiClient.get<{ users: UserHit[] }>('/api/v1/social/search', {
      params: { query, limit },
    })
    return data.users ?? []
  },
}
