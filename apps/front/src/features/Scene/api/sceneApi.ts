// ADR-003 — Scene Service client. Mirrors api/core/scene/v1/scene.proto.
// Backend always returns camelCase via gRPC-gateway (see auto-memory).
import { apiClient } from '@/shared/api/base'

export interface PlacedItem {
  itemId: string
  x: number
  y: number
  scale: number
  rotationDeg: number
  zIndex: number
  flipped: boolean
}

export type SceneScope = 'user_room' | 'guild_hall'

export interface SceneLayout {
  id: string
  scope: SceneScope
  ownerId: string
  width: number
  height: number
  backgroundRef: string
  items: PlacedItem[]
  updatedAt?: string
}

export interface SceneLayoutResponse {
  layout: SceneLayout
  canEdit: boolean
}

export const sceneApi = {
  async getUserRoom(userId: string): Promise<SceneLayoutResponse> {
    const r = await apiClient.get<SceneLayoutResponse>(`/api/v1/scene/users/${userId}/room`)
    return r.data
  },
  async updateUserRoom(userId: string, layout: Partial<SceneLayout>): Promise<SceneLayoutResponse> {
    const r = await apiClient.post<SceneLayoutResponse>(`/api/v1/scene/users/${userId}/room`, {
      userId,
      width: layout.width ?? 1200,
      height: layout.height ?? 800,
      backgroundRef: layout.backgroundRef ?? '',
      items: layout.items ?? [],
    })
    return r.data
  },
  async getGuildHall(guildId: string): Promise<SceneLayoutResponse> {
    const r = await apiClient.get<SceneLayoutResponse>(`/api/v1/scene/guilds/${guildId}/hall`)
    return r.data
  },
  async updateGuildHall(guildId: string, layout: Partial<SceneLayout>): Promise<SceneLayoutResponse> {
    const r = await apiClient.post<SceneLayoutResponse>(`/api/v1/scene/guilds/${guildId}/hall`, {
      guildId,
      width: layout.width ?? 1200,
      height: layout.height ?? 800,
      backgroundRef: layout.backgroundRef ?? '',
      items: layout.items ?? [],
    })
    return r.data
  },
}
