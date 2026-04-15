import type { ProfileProgress } from '@/entities/User/model/types'

export interface CompanyReadinessItem {
  name: string
  total: number
  completed: number
  active: number
  percent: number
  tone: 'success' | 'warning' | 'danger'
  nextStageKind: string
}

export function computeCompanyReadiness(progress: ProfileProgress): CompanyReadinessItem[] {
  const sessions = progress.mockSessions ?? []
  const byCompany = new Map<string, { name: string; total: number; completed: number; active: number; nextStageKind: string }>()

  for (const name of progress.companies) {
    byCompany.set(name, { name, total: 0, completed: 0, active: 0, nextStageKind: '' })
  }

  for (const session of sessions) {
    const key = session.companyTag || 'Unknown'
    const existing = byCompany.get(key) ?? { name: key, total: 0, completed: 0, active: 0, nextStageKind: '' }
    existing.total += Math.max(session.totalStages || 1, 1)
    existing.completed += Math.min(session.currentStageIndex, Math.max(session.totalStages || 1, 1))
    if (session.status === 'active') {
      existing.active += 1
      if (!existing.nextStageKind && session.currentStageKind) {
        existing.nextStageKind = session.currentStageKind
      }
    }
    if (session.status === 'finished') {
      existing.completed = Math.max(existing.completed, Math.max(session.totalStages || 1, 1))
    }
    byCompany.set(key, existing)
  }

  return Array.from(byCompany.values())
    .map(item => {
      const denominator = Math.max(item.total, item.completed, 1)
      const percent = Math.min(100, Math.round((item.completed / denominator) * 100))
      const tone: 'success' | 'warning' | 'danger' = percent >= 75 ? 'success' : percent >= 40 ? 'warning' : 'danger'
      return { ...item, percent, tone }
    })
    .sort((a, b) => b.percent - a.percent)
}
