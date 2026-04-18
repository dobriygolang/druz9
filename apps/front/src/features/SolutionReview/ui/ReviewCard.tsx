import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/shared/ui/Card'
import { Badge } from '@/shared/ui/Badge'
import { Spinner } from '@/shared/ui/Spinner'
import type { SolutionReview } from '../api/types'
import { cn } from '@/shared/lib/cn'

interface ReviewCardProps {
  review: SolutionReview | null
  loading?: boolean
  className?: string
  /** Show duel comparison section */
  showComparison?: boolean
}

const VERDICT_CONFIG = {
  optimal:    { label: 'Оптимальное',   variant: 'success' as const, emoji: '' },
  good:       { label: 'Хорошее',       variant: 'info' as const,    emoji: '' },
  suboptimal: { label: 'Неоптимальное', variant: 'warning' as const, emoji: '' },
  brute_force:{ label: 'Brute Force',   variant: 'danger' as const,  emoji: '' },
} as const

function formatTime(ms: number): string {
  if (ms <= 0) return '-'
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds} сек`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return remainingSeconds > 0 ? `${minutes} мин ${remainingSeconds} сек` : `${minutes} мин`
}

export function ReviewCard({ review, loading, className, showComparison = true }: ReviewCardProps) {
  const [expanded, setExpanded] = useState(false)
  const { t } = useTranslation()

  const verdictLabels = {
    optimal: t('reviewCard.verdict.optimal'),
    good: t('reviewCard.verdict.good'),
    suboptimal: t('reviewCard.verdict.suboptimal'),
    brute_force: t('reviewCard.verdict.bruteForce'),
  } as const

  const patternLabels: Record<string, string> = {
    two_pointers: t('reviewCard.pattern.twoPointers'),
    sliding_window: t('reviewCard.pattern.slidingWindow'),
    binary_search: t('reviewCard.pattern.binarySearch'),
    bfs: t('reviewCard.pattern.bfs'),
    dfs: t('reviewCard.pattern.dfs'),
    dynamic_programming: t('reviewCard.pattern.dynamicProgramming'),
    greedy: t('reviewCard.pattern.greedy'),
    backtracking: t('reviewCard.pattern.backtracking'),
    sorting: t('reviewCard.pattern.sorting'),
    hashing: t('reviewCard.pattern.hashing'),
    stack: t('reviewCard.pattern.stack'),
    queue: t('reviewCard.pattern.queue'),
    heap: t('reviewCard.pattern.heap'),
    linked_list: t('reviewCard.pattern.linkedList'),
    tree: t('reviewCard.pattern.tree'),
    graph: t('reviewCard.pattern.graph'),
    trie: t('reviewCard.pattern.trie'),
    union_find: t('reviewCard.pattern.unionFind'),
    bit_manipulation: t('reviewCard.pattern.bitManipulation'),
    math: t('reviewCard.pattern.math'),
    string: t('reviewCard.pattern.string'),
    matrix: t('reviewCard.pattern.matrix'),
    prefix_sum: t('reviewCard.pattern.prefixSum'),
    monotonic_stack: t('reviewCard.pattern.monotonicStack'),
    topological_sort: t('reviewCard.pattern.topologicalSort'),
    segment_tree: t('reviewCard.pattern.segmentTree'),
    divide_and_conquer: t('reviewCard.pattern.divideAndConquer'),
    simulation: t('reviewCard.pattern.simulation'),
    other: t('reviewCard.pattern.other'),
  }

  if (loading && !review) {
    return (
      <Card className={cn('flex items-center gap-3', className)}>
        <Spinner size="sm" />
        <span className="text-sm text-[#7A9982] dark:text-[#7BA88A]">{t('reviewCard.loading')}</span>
      </Card>
    )
  }

  if (!review) return null

  const isPending = review.status === 'pending'
  const isFailed = review.status === 'failed'
  const isReady = review.status === 'ready'

  return (
    <Card className={cn('space-y-3', className)} padding="md">
      {/* Level 1: Instant Feedback */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {review.isCorrect ? (
            <Badge variant="success">{t('reviewCard.accepted')}</Badge>
          ) : (
            <Badge variant="danger">{t('reviewCard.wrong')}</Badge>
          )}
          <span className="text-xs text-[#7A9982] dark:text-[#7BA88A]">
            {t('reviewCard.tests', { passed: review.passedCount, total: review.totalCount })}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-[#7A9982] dark:text-[#7BA88A]">
          <span>{t('reviewCard.time', { value: formatTime(review.solveTimeMs) })}</span>
          {review.medianTimeMs > 0 && (
            <span>{t('reviewCard.median', { value: formatTime(review.medianTimeMs) })}</span>
          )}
          <span>{t('reviewCard.attempt', { value: review.attemptNumber })}</span>
        </div>
      </div>

      {/* Level 2: AI Review */}
      {isPending && review.isCorrect && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm text-[#059669] dark:text-[#34D399] hover:underline"
        >
          <Spinner size="sm" />
          {t('reviewCard.analyzing')}
        </button>
      )}

      {isFailed && review.isCorrect && (
        <p className="text-xs text-[#94a3b8] dark:text-[#5a6a80]">
          {t('reviewCard.unavailable')}
        </p>
      )}

      {isReady && review.aiVerdict && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-between w-full text-left group"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[#1e293b] dark:text-[#e2e8f0]">
                {t('reviewCard.title')}
              </span>
              <Badge variant={VERDICT_CONFIG[review.aiVerdict]?.variant ?? 'default'}>
                {verdictLabels[review.aiVerdict] ?? review.aiVerdict}
              </Badge>
              {review.aiPattern && review.aiPattern !== 'other' && (
                <Badge variant="info">
                  {patternLabels[review.aiPattern] ?? review.aiPattern}
                </Badge>
              )}
            </div>
            <svg
              className={cn(
                'w-4 h-4 text-[#94a3b8] transition-transform',
                expanded && 'rotate-180',
              )}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expanded && (
            <div className="space-y-3 pt-1">
              {/* Complexity */}
              {(review.aiTimeComplexity || review.aiSpaceComplexity) && (
                <div className="flex gap-4 text-sm">
                  {review.aiTimeComplexity && (
                    <div>
                      <span className="text-[#94a3b8] dark:text-[#5a6a80]">{t('reviewCard.complexity.time')}</span>
                      <span className="font-mono text-[#1e293b] dark:text-[#e2e8f0]">
                        {review.aiTimeComplexity}
                      </span>
                    </div>
                  )}
                  {review.aiSpaceComplexity && (
                    <div>
                      <span className="text-[#94a3b8] dark:text-[#5a6a80]">{t('reviewCard.complexity.space')}</span>
                      <span className="font-mono text-[#1e293b] dark:text-[#e2e8f0]">
                        {review.aiSpaceComplexity}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Strengths */}
              {review.aiStrengths?.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-[#22c55e] dark:text-[#4ade80] mb-1">
                    {t('reviewCard.strengths')}
                  </h4>
                  <ul className="space-y-0.5">
                    {review.aiStrengths.map((s, i) => (
                      <li key={i} className="text-sm text-[#4B6B52] dark:text-[#94a3b8] flex gap-1.5">
                        <span className="text-[#22c55e] dark:text-[#4ade80] shrink-0">+</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Weaknesses */}
              {review.aiWeaknesses?.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-[#f59e0b] dark:text-[#fbbf24] mb-1">
                    {t('reviewCard.weaknesses')}
                  </h4>
                  <ul className="space-y-0.5">
                    {review.aiWeaknesses.map((w, i) => (
                      <li key={i} className="text-sm text-[#4B6B52] dark:text-[#94a3b8] flex gap-1.5">
                        <span className="text-[#f59e0b] dark:text-[#fbbf24] shrink-0">-</span>
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Hint */}
              {review.aiHint && (
                <div className="bg-[#eff6ff] dark:bg-[#0d2a1f] rounded-lg px-3 py-2 text-sm text-[#065F46] dark:text-[#34D399]">
                  <span className="font-medium">{t('reviewCard.hint')}</span>{review.aiHint}
                </div>
              )}

              {/* Skill Signals */}
              {review.aiSkillSignals && Object.keys(review.aiSkillSignals).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(review.aiSkillSignals).map(([skill, level]) => (
                    <Badge
                      key={skill}
                      variant={level === 'strong' ? 'success' : level === 'weak' ? 'danger' : 'default'}
                    >
                      {skill}: {level === 'strong' ? t('reviewCard.skill.strong') : level === 'weak' ? t('reviewCard.skill.weak') : t('reviewCard.skill.moderate')}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Level 3: Duel Comparison */}
              {showComparison && review.comparisonSummary && (
                <div className="border-t border-[#e2e8f0] dark:border-[#1E4035] pt-3">
                  <h4 className="text-xs font-medium text-[#059669] dark:text-[#34D399] mb-1">
                    {t('reviewCard.comparison')}
                  </h4>
                  <p className="text-sm text-[#4B6B52] dark:text-[#94a3b8]">
                    {review.comparisonSummary}
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Card>
  )
}
