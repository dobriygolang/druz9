import { apiClient } from '@/shared/api/base'
import type {
  ListThreadsResponse,
  GetThreadResponse,
  MarkThreadReadResponse,
  SendMessageResponse,
  GetUnreadCountResponse,
} from '../model/types'

export const inboxApi = {
  listThreads: async (params?: { limit?: number; offset?: number }): Promise<ListThreadsResponse> => {
    const { data } = await apiClient.get<ListThreadsResponse>('/api/v1/inbox/threads', {
      params: { limit: params?.limit ?? 50, offset: params?.offset ?? 0 },
    })
    return {
      threads: data.threads ?? [],
      total: data.total ?? 0,
      unreadTotal: data.unreadTotal ?? 0,
    }
  },

  getThread: async (threadId: string): Promise<GetThreadResponse> => {
    const { data } = await apiClient.get<GetThreadResponse>(`/api/v1/inbox/threads/${threadId}`)
    return {
      thread: data.thread,
      messages: data.messages ?? [],
    }
  },

  markThreadRead: async (threadId: string): Promise<MarkThreadReadResponse> => {
    const { data } = await apiClient.post<MarkThreadReadResponse>(
      `/api/v1/inbox/threads/${threadId}/read`,
      {},
    )
    return { ok: data.ok, unreadTotal: data.unreadTotal ?? 0 }
  },

  sendMessage: async (threadId: string, body: string): Promise<SendMessageResponse> => {
    const { data } = await apiClient.post<SendMessageResponse>(
      `/api/v1/inbox/threads/${threadId}/messages`,
      { body },
    )
    return { message: data.message }
  },

  getUnreadCount: async (): Promise<GetUnreadCountResponse> => {
    const { data } = await apiClient.get<GetUnreadCountResponse>('/api/v1/inbox/unread')
    return { unreadTotal: data.unreadTotal ?? 0 }
  },

  createThread: async (recipientId: string): Promise<{ threadId: string }> => {
    const { data } = await apiClient.post<{ threadId: string }>('/api/v1/inbox/threads', { recipientId })
    return data
  },
}
