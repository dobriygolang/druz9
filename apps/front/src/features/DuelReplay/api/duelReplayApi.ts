import { apiClient } from '@/shared/api/base'
import type { GetReplayResponse, ListReplaysResponse, EventKind } from '../model/types'

export const duelReplayApi = {
  getReplay: async (replayId: string): Promise<GetReplayResponse> => {
    const { data } = await apiClient.get<GetReplayResponse>(`/api/v1/duel-replays/${replayId}`)
    return {
      summary: data.summary,
      events: data.events ?? [],
    }
  },

  listMine: async (params?: { limit?: number; offset?: number }): Promise<ListReplaysResponse> => {
    const { data } = await apiClient.get<ListReplaysResponse>('/api/v1/duel-replays', {
      params: { limit: params?.limit ?? 50, offset: params?.offset ?? 0 },
    })
    return { replays: data.replays ?? [], total: data.total ?? 0 }
  },

  recordEvent: async (
    replayId: string,
    evt: { tMs: number; kind: EventKind; label?: string; linesCount?: number },
  ): Promise<void> => {
    await apiClient.post(`/api/v1/duel-replays/${replayId}/events`, {
      tMs: evt.tMs,
      kind: evt.kind,
      label: evt.label ?? '',
      linesCount: evt.linesCount ?? 0,
    })
  },
}
