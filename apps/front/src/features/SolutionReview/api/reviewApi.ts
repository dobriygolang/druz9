import { apiClient } from '@/shared/api/base'
import type { SolutionReview } from './types'

export const reviewApi = {
  /** Fetch review for a given submission (poll or initial load). */
  getBySubmission: async (submissionId: string): Promise<SolutionReview | null> => {
    try {
      const r = await apiClient.get<{ review?: SolutionReview }>(
        `/api/v1/code-editor/reviews/${submissionId}`,
      )
      return r.data.review ?? null
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status
      if (status === 404) return null
      throw e
    }
  },
}
