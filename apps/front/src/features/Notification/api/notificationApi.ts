import { apiClient } from '@/shared/api/base'

export type NotificationSettings = {
  duelsEnabled: boolean
  progressEnabled: boolean
  guildsEnabled: boolean
  dailyChallengeEnabled: boolean
  quietHoursStart: number
  quietHoursEnd: number
  timezone: string
  telegramLinked: boolean
}

export type NotificationSettingsUpdate = {
  duelsEnabled?: boolean
  progressEnabled?: boolean
  guildsEnabled?: boolean
  dailyChallengeEnabled?: boolean
}

export const notificationApi = {
  async getSettings(): Promise<NotificationSettings> {
    const res = await apiClient.get<NotificationSettings>('/api/v1/notifications/settings')
    return res.data
  },

  async updateSettings(upd: NotificationSettingsUpdate): Promise<void> {
    await apiClient.patch('/api/v1/notifications/settings', upd)
  },
}
