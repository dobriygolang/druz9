import { apiClient } from '@/shared/api/base'

export interface LiveChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LiveChatResponse {
  reply: string
}

export interface ChatOptions {
  // ADR-001: when set, the server applies that mentor's persona prompt
  // and (when no explicit model override) routes to the mentor's model_id.
  mentorId?: string
  model?: string
}

export function chatWithMentor(messages: LiveChatMessage[], opts: ChatOptions = {}): Promise<LiveChatResponse> {
  // silent=true: errors here are surfaced inline in the chat thread
  // (so the user can keep typing) instead of via a global red toast.
  return apiClient
    .post<LiveChatResponse>(
      '/api/v1/interview/live/chat',
      { messages, mentor_id: opts.mentorId, model: opts.model },
      { silent: true } as never,
    )
    .then((r) => r.data)
}
