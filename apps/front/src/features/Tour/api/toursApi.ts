// ADR-004 — Onboarding tours client. The list is small (handful of
// tour_ids) so we fetch it once on first Tour mount and cache nothing —
// state is owned by the BE.
import { apiClient } from '@/shared/api/base'

export const toursApi = {
  async list(): Promise<string[]> {
    const r = await apiClient.get<{ tourIds?: string[] }>('/api/v1/profile/tours', { silent: true } as never)
    return r.data.tourIds ?? []
  },
  async markCompleted(tourId: string): Promise<string[]> {
    const r = await apiClient.post<{ tourIds?: string[] }>(
      '/api/v1/profile/tours',
      { tourId },
      { silent: true } as never,
    )
    return r.data.tourIds ?? []
  },
}
