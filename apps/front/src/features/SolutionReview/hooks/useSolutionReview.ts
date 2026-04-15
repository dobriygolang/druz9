import { useState, useEffect, useCallback } from 'react'
import { reviewApi } from '../api/reviewApi'
import type { SolutionReview, ReviewReadyEvent } from '../api/types'

interface UseSolutionReviewOptions {
  submissionId: string | undefined
  /** If true, poll until review is ready (fallback for WS failures). */
  pollFallback?: boolean
}

/**
 * Hook that manages the lifecycle of a solution review.
 * - Fetches on mount when submissionId is set.
 * - Listens for WS review_ready events via onReviewReady callback.
 * - Falls back to polling every 3s if pollFallback is enabled.
 */
export function useSolutionReview({ submissionId, pollFallback = true }: UseSolutionReviewOptions) {
  const [review, setReview] = useState<SolutionReview | null>(null)
  const [loading, setLoading] = useState(false)

  // Fetch review from API
  const fetchReview = useCallback(async () => {
    if (!submissionId) return
    setLoading(true)
    try {
      const data = await reviewApi.getBySubmission(submissionId)
      if (data) setReview(data)
    } catch {
      // Silently ignore fetch errors
    } finally {
      setLoading(false)
    }
  }, [submissionId])

  // Initial fetch
  useEffect(() => {
    if (submissionId) {
      fetchReview()
    } else {
      setReview(null)
    }
  }, [submissionId, fetchReview])

  // Polling fallback: if review is pending, poll every 3s
  useEffect(() => {
    if (!pollFallback || !submissionId || !review || review.status !== 'pending') return

    const interval = setInterval(async () => {
      const data = await reviewApi.getBySubmission(submissionId)
      if (data && data.status !== 'pending') {
        setReview(data)
        clearInterval(interval)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [pollFallback, submissionId, review?.status])

  // Called by the WS listener when a review_ready event arrives
  const onReviewReady = useCallback(
    (event: ReviewReadyEvent) => {
      if (!submissionId || event.submissionId !== submissionId) return

      setReview((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          status: event.status,
          aiVerdict: event.verdict,
          aiTimeComplexity: event.timeComplexity,
          aiSpaceComplexity: event.spaceComplexity,
          aiPattern: event.pattern,
          aiStrengths: event.strengths ?? [],
          aiWeaknesses: event.weaknesses ?? [],
          aiHint: event.hint,
          aiSkillSignals: event.skillSignals ?? {},
          comparisonSummary: event.comparison,
        }
      })
    },
    [submissionId],
  )

  return {
    review,
    loading,
    onReviewReady,
    refetch: fetchReview,
  }
}
