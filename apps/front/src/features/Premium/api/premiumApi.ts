import { apiClient } from '@/shared/api/base'

export interface PremiumStatus {
  active: boolean
  source: string | null
  boostyEmail: string | null
  expiresAt: string | null
}

export const premiumApi = {
  getStatus: async (): Promise<PremiumStatus> => {
    try {
      const r = await apiClient.get<PremiumStatus>('/api/v1/premium/status')
      return r.data
    } catch {
      return { active: false, source: null, boostyEmail: null, expiresAt: null }
    }
  },

  linkBoosty: async (email: string): Promise<PremiumStatus> => {
    const r = await apiClient.post<PremiumStatus>('/api/v1/premium/boosty/link', { email })
    return r.data
  },

  unlinkBoosty: async (): Promise<void> => {
    await apiClient.delete('/api/v1/premium/boosty/link')
  },
}
