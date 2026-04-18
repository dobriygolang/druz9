import { apiClient } from '@/shared/api/base'
import type { Guild, GuildPulse, GuildChallenge, GuildMemberStats } from '@/entities/Guild/model/types'

type BackendGuild = {
  id: string
  name: string
  description?: string
  creatorId?: string
  memberCount?: number
  tags?: string[]
  isPublic?: boolean
  isJoined?: boolean
  createdAt?: string
}

function normalizeGuild(c: BackendGuild): Guild {
  return {
    id: c.id,
    name: c.name,
    description: c.description ?? '',
    creatorId: c.creatorId ?? '',
    memberCount: c.memberCount ?? 0,
    tags: c.tags ?? [],
    isPublic: c.isPublic ?? true,
    isJoined: c.isJoined ?? false,
    createdAt: c.createdAt ?? '',
  }
}

export interface CreateGuildPayload {
  name: string
  description?: string
  tags?: string[]
  isPublic?: boolean
}

export interface GuildMember {
  userId: string
  firstName: string
  lastName: string
  avatarUrl: string
  role: string
  joinedAt: string
}

function normalizeGuildRole(role: unknown): string {
  if (role === 'GUILD_MEMBER_ROLE_CREATOR' || role === 'creator') return 'creator'
  return 'member'
}

function normalizeGuildActionType(actionType: unknown): GuildPulse['recentActions'][number]['actionType'] {
  if (actionType === 'GUILD_MEMBER_ACTION_TYPE_DUEL' || actionType === 'duel') return 'duel'
  if (actionType === 'GUILD_MEMBER_ACTION_TYPE_MOCK' || actionType === 'mock') return 'mock'
  return 'daily'
}

export const guildApi = {
  getGuild: async (guildId: string): Promise<Guild> => {
    // Backend has no GET /api/v1/guilds/{id} — fetch list and find by id
    const r = await apiClient.get<{ guilds?: BackendGuild[] }>('/api/v1/guilds', {
      params: { limit: 200, offset: 0 },
    })
    const found = (r.data.guilds ?? []).find(c => c.id === guildId)
    if (!found) throw new Error('Guild not found')
    return normalizeGuild(found)
  },

  listGuilds: async (params?: { limit?: number; offset?: number }): Promise<{ guilds: Guild[]; totalCount: number }> => {
    const r = await apiClient.get<{ guilds?: BackendGuild[]; totalCount?: number }>('/api/v1/guilds', {
      params: { limit: params?.limit ?? 20, offset: params?.offset ?? 0 },
    })
    return {
      guilds: (r.data.guilds ?? []).map(normalizeGuild),
      totalCount: r.data.totalCount ?? 0,
    }
  },

  createGuild: async (payload: CreateGuildPayload): Promise<Guild> => {
    const r = await apiClient.post<{ guild: BackendGuild }>('/api/v1/guilds', {
      name: payload.name,
      description: payload.description ?? '',
      tags: payload.tags ?? [],
      isPublic: payload.isPublic ?? true,
    })
    return normalizeGuild(r.data.guild)
  },

  inviteMember: async (guildId: string, userId: string): Promise<void> => {
    await apiClient.post(`/api/v1/guilds/${guildId}/invite`, { userId })
  },

  joinGuild: async (guildId: string): Promise<void> => {
    await apiClient.post(`/api/v1/guilds/${guildId}/join`, {})
  },

  leaveGuild: async (guildId: string): Promise<void> => {
    await apiClient.post(`/api/v1/guilds/${guildId}/leave`, {})
  },
  listMembers: async (guildId: string): Promise<GuildMember[]> => {
    const r = await apiClient.get<{ members?: GuildMember[] }>(`/api/v1/guilds/${guildId}/members`)
    return (r.data.members ?? []).map((m) => ({ ...m, role: normalizeGuildRole(m.role) }))
  },

  deleteGuild: async (guildId: string): Promise<void> => {
    await apiClient.delete(`/api/v1/guilds/${guildId}`)
  },

  getGuildPulse: async (guildId: string): Promise<GuildPulse> => {
    const r = await apiClient.get<{
      activeToday?: number
      totalMembers?: number
      weekActivity?: GuildPulse['weekActivity']
      recentActions?: GuildPulse['recentActions']
    }>(`/api/v1/guilds/${guildId}/pulse`)
    return {
      activeToday: r.data.activeToday ?? 0,
      totalMembers: r.data.totalMembers ?? 0,
      weekActivity: r.data.weekActivity ?? [],
      recentActions: (r.data.recentActions ?? []).map((a) => ({ ...a, actionType: normalizeGuildActionType(a.actionType) })),
    }
  },

  getGuildMemberStats: async (guildId: string): Promise<GuildMemberStats[]> => {
    const r = await apiClient.get<{ members?: GuildMemberStats[] }>(`/api/v1/guilds/${guildId}/member-stats`)
    return (r.data.members ?? []).map((m) => ({ ...m, role: normalizeGuildRole(m.role) }))
  },

  getActiveChallenge: async (guildId: string): Promise<GuildChallenge | null> => {
    try {
      const r = await apiClient.get<{ challenge?: GuildChallenge }>(`/api/v1/guilds/${guildId}/challenge`)
      return r.data.challenge ?? null
    } catch {
      return null
    }
  },

  createChallenge: async (guildId: string, templateKey: string, targetValue: number): Promise<GuildChallenge> => {
    const r = await apiClient.post<{ challenge: GuildChallenge }>(`/api/v1/guilds/${guildId}/challenge`, {
      templateKey,
      targetValue,
    })
    return r.data.challenge
  },
}
