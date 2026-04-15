export type ReviewStatus = 'pending' | 'ready' | 'failed'
export type AIVerdict = 'optimal' | 'good' | 'suboptimal' | 'brute_force' | ''
export type SourceType = 'daily' | 'practice' | 'duel' | 'mock'

export interface SolutionReview {
  id: string
  submissionId: string
  sourceType: SourceType
  taskId: string

  // Level 1: instant
  isCorrect: boolean
  attemptNumber: number
  solveTimeMs: number
  medianTimeMs: number
  passedCount: number
  totalCount: number

  // Level 2: AI
  status: ReviewStatus
  aiVerdict: AIVerdict
  aiTimeComplexity: string
  aiSpaceComplexity: string
  aiPattern: string
  aiStrengths: string[]
  aiWeaknesses: string[]
  aiHint: string
  aiSkillSignals: Record<string, string>

  // Level 3: comparison
  comparisonSummary: string

  createdAt: string
}

/** WebSocket review_ready event payload */
export interface ReviewReadyEvent {
  reviewId: string
  submissionId: string
  status: ReviewStatus
  verdict: AIVerdict
  timeComplexity: string
  spaceComplexity: string
  pattern: string
  strengths: string[]
  weaknesses: string[]
  hint: string
  skillSignals: Record<string, string>
  comparison: string
  attemptNumber: number
  solveTimeMs: number
  medianTimeMs: number
}
