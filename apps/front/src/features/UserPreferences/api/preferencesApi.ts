// ADR-005 — UserPreferences client. Wraps profile.proto's
// GetUserPreferences / UpdateUserPreferences. Backend always returns
// camelCase via gRPC-gateway.
import { apiClient } from '@/shared/api/base'

// Server enum string form (proto camelCases the prefix).
export type LayoutDensityProto =
  | 'LAYOUT_DENSITY_UNSPECIFIED'
  | 'LAYOUT_DENSITY_COMFORTABLE'
  | 'LAYOUT_DENSITY_COMPACT'

export type LayoutDensity = 'comfortable' | 'compact'
export type LocaleCode = 'ru' | 'en'

export interface UserPreferences {
  layoutDensity: LayoutDensity
  locale: LocaleCode
}

interface RawPreferences {
  layoutDensity?: LayoutDensityProto | string
  locale?: string
}

function parseDensity(raw: unknown): LayoutDensity {
  return raw === 'LAYOUT_DENSITY_COMPACT' || raw === 'compact' ? 'compact' : 'comfortable'
}
function parseLocale(raw: unknown): LocaleCode {
  return raw === 'en' ? 'en' : 'ru'
}
function toProtoDensity(d: LayoutDensity): LayoutDensityProto {
  return d === 'compact' ? 'LAYOUT_DENSITY_COMPACT' : 'LAYOUT_DENSITY_COMFORTABLE'
}

function normalize(raw: RawPreferences): UserPreferences {
  return {
    layoutDensity: parseDensity(raw.layoutDensity),
    locale: parseLocale(raw.locale),
  }
}

export const preferencesApi = {
  async get(): Promise<UserPreferences> {
    const r = await apiClient.get<RawPreferences>('/api/v1/profile/preferences', { silent: true } as never)
    return normalize(r.data)
  },
  async update(patch: Partial<UserPreferences>): Promise<UserPreferences> {
    const body = {
      layoutDensity: patch.layoutDensity ? toProtoDensity(patch.layoutDensity) : undefined,
      locale: patch.locale,
    }
    const r = await apiClient.post<RawPreferences>('/api/v1/profile/preferences', body, { silent: true } as never)
    return normalize(r.data)
  },
}
