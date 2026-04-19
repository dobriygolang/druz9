import { apiClient } from '@/shared/api/base'

export interface LiveChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LiveChatResponse {
  reply: string
}

export interface ChatOptions {
  mentorId?: string
  model?: string
}

export function chatWithMentor(messages: LiveChatMessage[], opts: ChatOptions = {}): Promise<LiveChatResponse> {
  return apiClient
    .post<LiveChatResponse>(
      '/api/v1/interview/live/chat',
      { messages, mentor_id: opts.mentorId, model: opts.model },
      { silent: true } as never,
    )
    .then((r) => r.data)
}

export interface SaveSessionPayload {
  focus: string
  frontId?: string
  transcript: Array<{ role: string; content: string }>
  code: string
  evaluation: string
  durationS: number
}

export function saveSession(payload: SaveSessionPayload): Promise<{ id: string }> {
  return apiClient
    .post<{ id: string }>('/api/v1/interview/live/sessions', payload, { silent: true } as never)
    .then((r) => r.data)
    .catch(() => ({ id: '' }))
}

// Calls the mentor chat API with a structured evaluation prompt.
// Returns the raw AI text — shown directly in the evaluation panel.
export async function evaluateSession(
  mentor: string,
  topic: string,
  question: string,
  rubric: string[],
  transcript: LiveChatMessage[],
  code: string,
  opts: ChatOptions = {},
): Promise<string> {
  const codeSection = code.trim()
    ? `\n\nCandidate's final code:\n\`\`\`\n${code.slice(0, 3000)}\n\`\`\``
    : ''
  const rubricList = rubric.map((r, i) => `${i + 1}. ${r}`).join('\n')

  const evalPrompt: LiveChatMessage = {
    role: 'user',
    content: `The interview is now over. Please evaluate the candidate's performance for this session.\n\nTopic: ${topic}\nProblem: ${question}${codeSection}\n\nRate each rubric criterion on a scale of 1–5 and give a 1-sentence note. Then write a short overall summary (2–3 sentences).\n\nRubric:\n${rubricList}\n\nFormat:\n- Criterion: X/5 — note\n...\nOverall: ...`,
  }

  const systemMsg: LiveChatMessage = {
    role: 'system',
    content: `You are ${mentor}, an expert technical interviewer. The candidate just completed a live interview. Provide an honest, constructive evaluation.`,
  }

  const { reply } = await chatWithMentor([systemMsg, ...transcript, evalPrompt], opts)
  return reply
}
