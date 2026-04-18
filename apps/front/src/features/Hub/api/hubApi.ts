import { apiClient } from '@/shared/api/base'

export interface HubOverview {
  player: {
    id: string
    displayName: string
    title?: string
    levelLabel?: string
    streakDays?: number
    achievements?: { unlocked: number; total?: number }
  }
  dailyMissions: Array<{
    key: string
    title: string
    progressLabel?: string
    current: number
    target: number
    completed: boolean
    rewardLabel?: string
    actionUrl?: string
    icon?: string
  }>
  quest: {
    title: string
    description: string
    progressPct?: number
    actionUrl: string
    actionLabel: string
  } | null
  arena: {
    items: Array<{ label: string; meta?: string; actionUrl?: string }>
  }
  events: Array<{
    id: string
    title: string
    startsAt?: string
    meta?: string
    actionUrl?: string
  }>
  guild: {
    id?: string
    name: string
    memberPreview: string[]
    actionUrl?: string
  } | null
  merchantPicks: Array<{
    id: string
    name: string
    rarity?: string
    priceLabel?: string
    actionUrl?: string
  }>
}

type RawHubOverview = Partial<HubOverview>

function normalizeHubOverview(data: RawHubOverview): HubOverview {
  return {
    player: {
      id: data.player?.id ?? '',
      displayName: data.player?.displayName ?? 'Wanderer',
      title: data.player?.title,
      levelLabel: data.player?.levelLabel,
      streakDays: data.player?.streakDays,
      achievements: data.player?.achievements,
    },
    dailyMissions: (data.dailyMissions ?? []).map((mission) => ({
      key: mission.key,
      title: mission.title,
      progressLabel: mission.progressLabel,
      current: mission.current ?? 0,
      target: mission.target ?? 0,
      completed: mission.completed ?? false,
      rewardLabel: mission.rewardLabel,
      actionUrl: mission.actionUrl,
      icon: mission.icon,
    })),
    quest: data.quest
      ? {
          title: data.quest.title,
          description: data.quest.description,
          progressPct: data.quest.progressPct,
          actionUrl: data.quest.actionUrl,
          actionLabel: data.quest.actionLabel,
        }
      : null,
    arena: {
      items: (data.arena?.items ?? []).map((item) => ({
        label: item.label,
        meta: item.meta,
        actionUrl: item.actionUrl,
      })),
    },
    events: (data.events ?? []).map((event) => ({
      id: event.id,
      title: event.title,
      startsAt: event.startsAt,
      meta: event.meta,
      actionUrl: event.actionUrl,
    })),
    guild: data.guild
      ? {
          id: data.guild.id,
          name: data.guild.name,
          memberPreview: data.guild.memberPreview ?? [],
          actionUrl: data.guild.actionUrl,
        }
      : null,
    merchantPicks: (data.merchantPicks ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      rarity: item.rarity,
      priceLabel: item.priceLabel,
      actionUrl: item.actionUrl,
    })),
  }
}

export const hubApi = {
  getOverview: async (): Promise<HubOverview> => {
    const { data } = await apiClient.get<RawHubOverview>('/api/v1/hub/overview')
    return normalizeHubOverview(data)
  },
}
