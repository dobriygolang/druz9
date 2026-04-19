// ADR-002 — InsightsService client. Backend always returns camelCase via
// gRPC-gateway.
import { apiClient } from '@/shared/api/base'

export interface InsightItem {
  title: string
  description: string
  actionUrl?: string
}

export interface Insight {
  summary: string
  topStrengths: InsightItem[]
  topGaps: InsightItem[]
  nextSteps: InsightItem[]
  generatedAt?: string
  source: string
}

interface RawItem {
  title?: string
  description?: string
  actionUrl?: string
  action_url?: string
}

interface RawInsight {
  summary?: string
  topStrengths?: RawItem[]
  top_strengths?: RawItem[]
  topGaps?: RawItem[]
  top_gaps?: RawItem[]
  nextSteps?: RawItem[]
  next_steps?: RawItem[]
  generatedAt?: string
  generated_at?: string
  source?: string
}

function normalizeItem(it: RawItem): InsightItem {
  return {
    title: it.title ?? '',
    description: it.description ?? '',
    actionUrl: it.actionUrl ?? it.action_url ?? undefined,
  }
}

function normalize(raw: RawInsight): Insight {
  return {
    summary: raw.summary ?? '',
    topStrengths: (raw.topStrengths ?? raw.top_strengths ?? []).map(normalizeItem),
    topGaps: (raw.topGaps ?? raw.top_gaps ?? []).map(normalizeItem),
    nextSteps: (raw.nextSteps ?? raw.next_steps ?? []).map(normalizeItem),
    generatedAt: raw.generatedAt ?? raw.generated_at,
    source: raw.source ?? 'deterministic',
  }
}

export const insightsApi = {
  async getMine(): Promise<Insight> {
    const r = await apiClient.get<RawInsight>('/api/v1/insights/me', { silent: true } as never)
    return normalize(r.data)
  },
}
