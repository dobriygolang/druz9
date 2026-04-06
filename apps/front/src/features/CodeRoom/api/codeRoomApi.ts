import { apiClient, withGuestCodeRoomHeaders } from '@/shared/api/base'
import { createCache } from '@/shared/api/cache'
import type { Room, Task } from '@/entities/CodeRoom/model/types'

type BackendRoom = {
  id: string
  mode?: string
  code?: string
  status?: string
  inviteCode?: string
  task?: string
  createdAt?: string
  participants?: Array<{
    userId?: string; name?: string; isGuest?: boolean; isReady?: boolean; isWinner?: boolean; joinedAt?: string; isCreator?: boolean
  }>
  taskId?: string
  codeRevision?: number
  creatorId?: string
  isPrivate?: boolean
}

function normalizeRoom(r: BackendRoom): Room {
  return {
    id: r.id,
    mode: (r.mode as Room['mode']) ?? 'ROOM_MODE_UNSPECIFIED',
    code: r.code ?? '',
    status: (r.status as Room['status']) ?? 'ROOM_STATUS_UNSPECIFIED',
    inviteCode: r.inviteCode ?? '',
    task: r.task ?? '',
    createdAt: r.createdAt ?? '',
    participants: (r.participants ?? []).map((p) => ({
      userId: p.userId ?? '', name: p.name ?? '', isGuest: p.isGuest ?? false,
      isReady: p.isReady ?? false, isWinner: p.isWinner ?? false, joinedAt: p.joinedAt ?? '', isCreator: p.isCreator ?? false,
    })),
    taskId: r.taskId ?? '',
    codeRevision: r.codeRevision ?? 0,
    creatorId: r.creatorId ?? '',
    isPrivate: r.isPrivate ?? false,
  }
}

const listTasksCache = createCache<string, Task[]>()

export const codeRoomApi = {
  listTasks: async (params?: { topic?: string; difficulty?: string }): Promise<Task[]> => {
    const key = JSON.stringify(params ?? {})
    const inFlight = listTasksCache.getInFlight(key)
    if (inFlight) return inFlight
    const req = apiClient.get<{ tasks?: unknown[] }>('/api/v1/code-editor/tasks', { params })
      .then(r => (r.data.tasks ?? []) as Task[])
      .finally(() => listTasksCache.deleteInFlight(key))
    listTasksCache.setInFlight(key, req)
    return req
  },
  createRoom: async (payload: { mode?: string; task?: string; name?: string; topic?: string; difficulty?: string; isPrivate?: boolean }, guestName?: string): Promise<{ room: Room; inviteCode: string }> => {
    const r = await apiClient.post<{ room?: BackendRoom; inviteCode?: string }>(
      '/api/v1/code-editor/rooms',
      { mode: payload.mode ?? 'ROOM_MODE_ALL', task: payload.task, name: payload.name, topic: payload.topic, difficulty: payload.difficulty, isPrivate: payload.isPrivate },
      { headers: withGuestCodeRoomHeaders(guestName) },
    )
    return { room: normalizeRoom(r.data.room ?? { id: '' }), inviteCode: r.data.inviteCode ?? '' }
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
      { inviteCode, name },
      { headers: withGuestCodeRoomHeaders(guestName) },
    )
    return normalizeRoom(r.data.room ?? { id: '' })
  },
  leaveRoom: async (roomId: string): Promise<void> => {
    await apiClient.post(`/api/v1/code-editor/rooms/${roomId}/leave`, {})
  },
  submitCode: async (roomId: string, code: string, guestName?: string): Promise<{ output: string; error: string; isCorrect: boolean }> => {
    const r = await apiClient.post<{ output?: string; error?: string; isCorrect?: boolean }>(
      `/api/v1/code-editor/rooms/${roomId}/submit`,
      { code },
      { headers: withGuestCodeRoomHeaders(guestName) },
    )
    return { output: r.data.output ?? '', error: r.data.error ?? '', isCorrect: r.data.isCorrect ?? false }
  },
  updateRoomTask: async (roomId: string, task: string, taskStatement: string): Promise<void> => {
    await apiClient.patch(`/api/v1/code-editor/rooms/${roomId}`, { task, taskStatement })
  },
  setReady: async (roomId: string, ready: boolean): Promise<void> => {
    await apiClient.post(`/api/v1/code-editor/rooms/${roomId}/ready`, { ready })
  },
  getLeaderboard: async () => {
    const r = await apiClient.get<{ entries?: unknown[] }>('/api/v1/code-editor/leaderboard', { params: { limit: 20 } })
    return r.data.entries ?? []
  },
  startRoom: async (roomId: string): Promise<void> => {
    await apiClient.post(`/api/v1/code-editor/rooms/${roomId}/start`, {})
  },
  listRooms: async (): Promise<Room[]> => {
    const r = await apiClient.get<{ rooms?: BackendRoom[] }>('/api/v1/code-editor/rooms')
    return (r.data.rooms ?? []).map(normalizeRoom)
  },
  updateRoomPrivacy: async (roomId: string, isPrivate: boolean): Promise<void> => {
    await apiClient.patch(`/api/v1/code-editor/rooms/${roomId}`, { isPrivate })
  },
  closeRoom: async (roomId: string): Promise<void> => {
    await apiClient.post(`/api/v1/code-editor/rooms/${roomId}/close`, {})
  },
}
