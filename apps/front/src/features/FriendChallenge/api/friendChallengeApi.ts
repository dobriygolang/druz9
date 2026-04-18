import { apiClient } from '@/shared/api/base'
import type {
  ListChallengesResponse,
  FriendChallenge,
  ChallengeDifficulty,
} from '../model/types'

interface Paging {
  limit?: number
  offset?: number
}

export const friendChallengeApi = {
  listIncoming: async (p?: Paging): Promise<ListChallengesResponse> => {
    const { data } = await apiClient.get<ListChallengesResponse>('/api/v1/challenges/incoming', {
      params: { limit: p?.limit ?? 50, offset: p?.offset ?? 0 },
    })
    return { challenges: data.challenges ?? [], total: data.total ?? 0 }
  },

  listSent: async (p?: Paging): Promise<ListChallengesResponse> => {
    const { data } = await apiClient.get<ListChallengesResponse>('/api/v1/challenges/sent', {
      params: { limit: p?.limit ?? 50, offset: p?.offset ?? 0 },
    })
    return { challenges: data.challenges ?? [], total: data.total ?? 0 }
  },

  listHistory: async (p?: Paging): Promise<ListChallengesResponse> => {
    const { data } = await apiClient.get<ListChallengesResponse>('/api/v1/challenges/history', {
      params: { limit: p?.limit ?? 50, offset: p?.offset ?? 0 },
    })
    return { challenges: data.challenges ?? [], total: data.total ?? 0 }
  },

  send: async (body: {
    opponentUsername: string
    taskTitle: string
    taskTopic: string
    taskDifficulty: ChallengeDifficulty
    taskRef?: string
    note?: string
  }): Promise<FriendChallenge> => {
    const { data } = await apiClient.post<{ challenge: FriendChallenge }>('/api/v1/challenges', {
      opponentUsername: body.opponentUsername,
      taskTitle: body.taskTitle,
      taskTopic: body.taskTopic,
      taskDifficulty: body.taskDifficulty,
      taskRef: body.taskRef ?? '',
      note: body.note ?? '',
    })
    return data.challenge
  },

  submit: async (challengeId: string, timeMs: number, score: number): Promise<FriendChallenge> => {
    const { data } = await apiClient.post<{ challenge: FriendChallenge }>(
      `/api/v1/challenges/${challengeId}/submit`,
      { timeMs, score },
    )
    return data.challenge
  },

  decline: async (challengeId: string): Promise<FriendChallenge> => {
    const { data } = await apiClient.post<{ challenge: FriendChallenge }>(
      `/api/v1/challenges/${challengeId}/decline`,
      {},
    )
    return data.challenge
  },
}
