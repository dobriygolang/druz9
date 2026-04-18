import { apiClient } from '@/shared/api/base'

export interface LiveChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LiveChatResponse {
  reply: string
}

export function chatWithMentor(messages: LiveChatMessage[]): Promise<LiveChatResponse> {
  return apiClient
    .post<LiveChatResponse>('/api/v1/interview/live/chat', { messages })
    .then((r) => r.data)
}
