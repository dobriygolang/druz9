import { apiClient, withGuestCodeRoomHeaders } from '@/shared/api/base'
import type { Room, Task } from '@/entities/CodeRoom/model/types'

type BackendRoom = {
  id: string
  mode?: string
  code?: string
  status?: string
  invite_code?: string
  task?: string
  created_at?: string
  participants?: Array<{
    user_id?: string; name?: string; is_guest?: boolean; is_ready?: boolean; is_winner?: boolean; joined_at?: string; is_creator?: boolean
  }>
  task_id?: string
  code_revision?: number
  creator_id?: string
}

function normalizeRoom(r: BackendRoom): Room {
  return {
    id: r.id,
    mode: (r.mode as Room['mode']) ?? 'ROOM_MODE_UNSPECIFIED',
    code: r.code ?? '',
    status: (r.status as Room['status']) ?? 'ROOM_STATUS_UNSPECIFIED',
    inviteCode: r.invite_code ?? '',
    task: r.task ?? '',
    createdAt: r.created_at ?? '',
    participants: (r.participants ?? []).map((p) => ({
      userId: p.user_id ?? '', name: p.name ?? '', isGuest: p.is_guest ?? false,
      isReady: p.is_ready ?? false, isWinner: p.is_winner ?? false, joinedAt: p.joined_at ?? '', isCreator: p.is_creator ?? false,
    })),
    taskId: r.task_id ?? '',
    codeRevision: r.code_revision ?? 0,
    creatorId: r.creator_id ?? '',
  }
}

export const codeRoomApi = {
  listTasks: async (params?: { topic?: string; difficulty?: string }): Promise<Task[]> => {
    const r = await apiClient.get<{ tasks?: unknown[] }>('/api/v1/code-editor/tasks', { params })
    return (r.data.tasks ?? []) as Task[]
  },
  createRoom: async (payload: { mode?: string; task?: string; name?: string; topic?: string; difficulty?: string }, guestName?: string): Promise<{ room: Room; inviteCode: string }> => {
    const r = await apiClient.post<{ room?: BackendRoom; invite_code?: string }>(
      '/api/v1/code-editor/rooms',
      { mode: payload.mode ?? 'ROOM_MODE_ALL', task: payload.task, name: payload.name, topic: payload.topic, difficulty: payload.difficulty },
      { headers: withGuestCodeRoomHeaders(guestName) },
    )
    return { room: normalizeRoom(r.data.room ?? { id: '' }), inviteCode: r.data.invite_code ?? '' }
  },
  getRoom: async (roomId: string, guestName?: string): Promise<Room> => {
    const r = await apiClient.get<{ room?: BackendRoom }>(`/api/v1/code-editor/rooms/${roomId}`, {
      headers: withGuestCodeRoomHeaders(guestName),
    })
    return normalizeRoom(r.data.room ?? { id: roomId })
  },
  joinRoom: async (roomId: string, name?: string, guestName?: string): Promise<Room> => {
    const r = await apiClient.post<{ room?: BackendRoom }>(
      `/api/v1/code-editor/rooms/${roomId}/join`,
      { name },
      { headers: withGuestCodeRoomHeaders(guestName) },
    )
    return normalizeRoom(r.data.room ?? { id: roomId })
  },
  joinRoomByInviteCode: async (inviteCode: string, name?: string, guestName?: string): Promise<Room> => {
    const r = await apiClient.post<{ room?: BackendRoom }>(
      '/api/v1/code-editor/join',
      { invite_code: inviteCode, name },
      { headers: withGuestCodeRoomHeaders(guestName) },
    )
    return normalizeRoom(r.data.room ?? { id: '' })
  },
  leaveRoom: async (roomId: string): Promise<void> => {
    await apiClient.post(`/api/v1/code-editor/rooms/${roomId}/leave`, {})
  },
  submitCode: async (roomId: string, code: string, guestName?: string): Promise<{ output: string; error: string; isCorrect: boolean }> => {
    const r = await apiClient.post<{ output?: string; error?: string; is_correct?: boolean }>(
      `/api/v1/code-editor/rooms/${roomId}/submit`,
      { code },
      { headers: withGuestCodeRoomHeaders(guestName) },
    )
    return { output: r.data.output ?? '', error: r.data.error ?? '', isCorrect: r.data.is_correct ?? false }
  },
  setReady: async (roomId: string, ready: boolean): Promise<void> => {
    await apiClient.post(`/api/v1/code-editor/rooms/${roomId}/ready`, { ready })
  },
  getLeaderboard: async () => {
    const r = await apiClient.get<{ entries?: unknown[] }>('/api/v1/code-editor/leaderboard', { params: { limit: 20 } })
    return r.data.entries ?? []
  },
}
