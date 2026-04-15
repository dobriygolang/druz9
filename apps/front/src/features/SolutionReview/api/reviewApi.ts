import { apiClient } from '@/shared/api/base'
import type { SolutionReview } from './types'

function normalizeSourceType(value: unknown): SolutionReview['sourceType'] {
  if (value === 'REVIEW_SOURCE_TYPE_DAILY' || value === 'daily') return 'daily'
  if (value === 'REVIEW_SOURCE_TYPE_DUEL' || value === 'duel') return 'duel'
  if (value === 'REVIEW_SOURCE_TYPE_MOCK' || value === 'mock') return 'mock'
  return 'practice'
}

function normalizeReviewStatus(value: unknown): SolutionReview['status'] {
  if (value === 'REVIEW_STATUS_READY' || value === 'ready') return 'ready'
  if (value === 'REVIEW_STATUS_FAILED' || value === 'failed') return 'failed'
  return 'pending'
}

function normalizeVerdict(value: unknown): SolutionReview['aiVerdict'] {
  if (value === 'AI_VERDICT_OPTIMAL' || value === 'optimal') return 'optimal'
  if (value === 'AI_VERDICT_GOOD' || value === 'good') return 'good'
  if (value === 'AI_VERDICT_SUBOPTIMAL' || value === 'suboptimal') return 'suboptimal'
  if (value === 'AI_VERDICT_BRUTE_FORCE' || value === 'brute_force') return 'brute_force'
  return ''
}

export const reviewApi = {
  /** Fetch review for a given submission (poll or initial load). */
  getBySubmission: async (submissionId: string): Promise<SolutionReview | null> => {
    try {
      const r = await apiClient.get<{ review?: SolutionReview }>(
        `/api/v1/code-editor/reviews/${submissionId}`,
      )
      return r.data.review ? {
        ...r.data.review,
        sourceType: normalizeSourceType(r.data.review.sourceType),
        status: normalizeReviewStatus(r.data.review.status),
        aiVerdict: normalizeVerdict(r.data.review.aiVerdict),
      } : null
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status
      if (status === 404) return null
      throw e
    }
  },
}
