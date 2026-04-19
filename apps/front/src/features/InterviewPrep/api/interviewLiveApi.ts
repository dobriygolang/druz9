import { apiClient } from '@/shared/api/base'

export interface LiveChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LiveChatResponse {
  reply: string
}

export function chatWithMentor(messages: LiveChatMessage[]): Promise<LiveChatResponse> {
  // silent=true: errors here are surfaced inline in the chat thread
  // (so the user can keep typing) instead of via a global red toast.
  return apiClient
    .post<LiveChatResponse>('/api/v1/interview/live/chat', { messages }, { silent: true } as never)
    .then((r) => r.data)
}
