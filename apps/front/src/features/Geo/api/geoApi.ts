import { apiClient } from '@/shared/api/base'

export interface GeoSuggestion {
  placeLabel: string
  city?: string
  region?: string
  country?: string
  latitude: number
  longitude: number
}

type BackendGeoSuggestion = {
  place_label?: string
  city?: string
  region?: string
  country?: string
  latitude?: number
  longitude?: number
}

export const geoApi = {
  suggest: async (query: string): Promise<GeoSuggestion[]> => {
    const r = await apiClient.get<{ suggestions?: BackendGeoSuggestion[] }>('/api/v1/geo/suggest', { params: { q: query } })
    return (r.data.suggestions ?? []).map((s) => ({
      placeLabel: s.place_label ?? '', city: s.city, region: s.region, country: s.country,
      latitude: s.latitude ?? 0, longitude: s.longitude ?? 0,
    }))
  },
}
