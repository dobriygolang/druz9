import { useState } from 'react'
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

const PATTERN_LABELS: Record<string, string> = {
  two_pointers: 'Two Pointers', sliding_window: 'Sliding Window',
  binary_search: 'Binary Search', bfs: 'BFS', dfs: 'DFS',
  dynamic_programming: 'Dynamic Programming', greedy: 'Greedy',
  backtracking: 'Backtracking', sorting: 'Sorting', hashing: 'Hashing',
  stack: 'Stack', queue: 'Queue', heap: 'Heap', linked_list: 'Linked List',
  tree: 'Tree', graph: 'Graph', trie: 'Trie', union_find: 'Union Find',
  bit_manipulation: 'Bit Manipulation', math: 'Math', string: 'String',
  matrix: 'Matrix', prefix_sum: 'Prefix Sum', monotonic_stack: 'Monotonic Stack',
  topological_sort: 'Topological Sort', segment_tree: 'Segment Tree',
  divide_and_conquer: 'Divide & Conquer', simulation: 'Simulation',
  other: 'Other',
}

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

  if (loading && !review) {
    return (
      <Card className={cn('flex items-center gap-3', className)}>
        <Spinner size="sm" />
        <span className="text-sm text-[#64748b] dark:text-[#7e93b0]">Загрузка разбора...</span>
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
            <Badge variant="success">Принято</Badge>
          ) : (
            <Badge variant="danger">Неверно</Badge>
          )}
          <span className="text-xs text-[#64748b] dark:text-[#7e93b0]">
            Тесты: {review.passedCount}/{review.totalCount}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-[#64748b] dark:text-[#7e93b0]">
          <span>Время: {formatTime(review.solveTimeMs)}</span>
          {review.medianTimeMs > 0 && (
            <span>Медиана: {formatTime(review.medianTimeMs)}</span>
          )}
          <span>Попытка: {review.attemptNumber}</span>
        </div>
      </div>

      {/* Level 2: AI Review */}
      {isPending && review.isCorrect && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm text-[#6366f1] dark:text-[#818cf8] hover:underline"
        >
          <Spinner size="sm" />
          Анализируем решение...
        </button>
      )}

      {isFailed && review.isCorrect && (
        <p className="text-xs text-[#94a3b8] dark:text-[#5a6a80]">
          AI-разбор недоступен для этого решения.
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
                Разбор решения
              </span>
              <Badge variant={VERDICT_CONFIG[review.aiVerdict]?.variant ?? 'default'}>
                {VERDICT_CONFIG[review.aiVerdict]?.label ?? review.aiVerdict}
              </Badge>
              {review.aiPattern && review.aiPattern !== 'other' && (
                <Badge variant="info">
                  {PATTERN_LABELS[review.aiPattern] ?? review.aiPattern}
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
                      <span className="text-[#94a3b8] dark:text-[#5a6a80]">Time: </span>
                      <span className="font-mono text-[#1e293b] dark:text-[#e2e8f0]">
                        {review.aiTimeComplexity}
                      </span>
                    </div>
                  )}
                  {review.aiSpaceComplexity && (
                    <div>
                      <span className="text-[#94a3b8] dark:text-[#5a6a80]">Space: </span>
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
                    Что хорошо
                  </h4>
                  <ul className="space-y-0.5">
                    {review.aiStrengths.map((s, i) => (
                      <li key={i} className="text-sm text-[#475569] dark:text-[#94a3b8] flex gap-1.5">
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
                    Что улучшить
                  </h4>
                  <ul className="space-y-0.5">
                    {review.aiWeaknesses.map((w, i) => (
                      <li key={i} className="text-sm text-[#475569] dark:text-[#94a3b8] flex gap-1.5">
                        <span className="text-[#f59e0b] dark:text-[#fbbf24] shrink-0">-</span>
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Hint */}
              {review.aiHint && (
                <div className="bg-[#eff6ff] dark:bg-[#0d1e40] rounded-lg px-3 py-2 text-sm text-[#3730a3] dark:text-[#818cf8]">
                  <span className="font-medium">Совет: </span>{review.aiHint}
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
                      {skill}: {level === 'strong' ? 'strong' : level === 'weak' ? 'weak' : 'moderate'}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Level 3: Duel Comparison */}
              {showComparison && review.comparisonSummary && (
                <div className="border-t border-[#e2e8f0] dark:border-[#1e293b] pt-3">
                  <h4 className="text-xs font-medium text-[#6366f1] dark:text-[#818cf8] mb-1">
                    Сравнение с соперником
                  </h4>
                  <p className="text-sm text-[#475569] dark:text-[#94a3b8]">
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
