// ADR-002 — Atlas region context client. Returns localized title/body
// for a clicked region. Backend catalog lives in internal/api/hub.
import { apiClient } from '@/shared/api/base'

export interface RegionLink {
  label: string
  actionUrl: string
}

export interface RegionContext {
  regionId: string
  title: string
  description: string
  activeGuilds: number
  openEvents: number
  podcasts: number
  links: RegionLink[]
}

interface RawLink { label?: string; actionUrl?: string }
interface Raw {
  regionId?: string
  title?: string
  description?: string
  activeGuilds?: number
  openEvents?: number
  podcasts?: number
  links?: RawLink[]
}

function normalize(raw: Raw): RegionContext {
  return {
    regionId: raw.regionId ?? '',
    title: raw.title ?? '',
    description: raw.description ?? '',
    activeGuilds: raw.activeGuilds ?? 0,
    openEvents: raw.openEvents ?? 0,
    podcasts: raw.podcasts ?? 0,
    links: (raw.links ?? []).map((l) => ({ label: l.label ?? '', actionUrl: l.actionUrl ?? '' })),
  }
}

export const regionsApi = {
  async get(regionId: string): Promise<RegionContext> {
    const r = await apiClient.get<Raw>(`/api/v1/hub/regions/${regionId}`, { silent: true } as never)
    return normalize(r.data)
  },
}
