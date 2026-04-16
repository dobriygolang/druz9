import { useState, useCallback } from 'react'
import { Eye, Send, Star, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { apiClient } from '@/shared/api/base'
import { Card } from '@/shared/ui/Card'
import { Button } from '@/shared/ui/Button'
import { PageMeta } from '@/shared/ui/PageMeta'

interface BlindReviewTask {
  sourceReviewId: string
  taskId: string
  taskTitle: string
  taskStatement: string
  code: string
  language: string
}

interface BlindReviewResult {
  id: string
  aiScore: number
  aiFeedback: string
}

export function BlindReviewPage() {
  const { t } = useTranslation()
  const [task, setTask] = useState<BlindReviewTask | null>(null)
  const [review, setReview] = useState('')
  const [result, setResult] = useState<BlindReviewResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetchingTask, setFetchingTask] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTask = useCallback(async () => {
    setFetchingTask(true)
    setError(null)
    setResult(null)
    setReview('')
    try {
      const { data } = await apiClient.get('/api/v1/challenges/blind-review')
      setTask(data)
    } catch {
      setError(t('blindReview.noTasks', 'No code available for review right now. Try again later.'))
    } finally {
      setFetchingTask(false)
    }
  }, [t])

  const submitReview = useCallback(async () => {
    if (!task || review.trim().length < 10) return
    setLoading(true)
    setError(null)
    try {
      const { data } = await apiClient.post('/api/v1/challenges/blind-review/submit', {
        sourceReviewId: task.sourceReviewId,
        taskId: task.taskId,
        sourceCode: task.code,
        sourceLanguage: task.language,
        userReview: review,
      })
      setResult(data)
    } catch {
      setError(t('blindReview.submitError', 'Failed to submit review.'))
    } finally {
      setLoading(false)
    }
  }, [task, review, t])

  const scoreColor = (score: number) => {
    if (score >= 8) return 'text-emerald-500'
    if (score >= 5) return 'text-amber-500'
    return 'text-red-500'
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-6 md:px-6">
      <PageMeta title={t('blindReview.meta.title', 'Blind Review')} description={t('blindReview.meta.desc', 'Review anonymous code and get AI feedback')} canonicalPath="/practice/blind-review" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#111111] dark:text-[#E2F0E8]">
            {t('blindReview.title', 'Blind Code Review')}
          </h1>
          <p className="mt-1 text-xs text-[#7A9982] dark:text-[#7BA88A]">
            {t('blindReview.subtitle', 'Review anonymous code. AI evaluates the quality of your review.')}
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={fetchTask} disabled={fetchingTask}>
          {fetchingTask ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
          {task ? t('blindReview.next', 'Next') : t('blindReview.start', 'Start')}
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {task && !result && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card padding="lg">
            <h2 className="mb-2 text-sm font-semibold text-[#111111] dark:text-[#E2F0E8]">
              {task.taskTitle}
            </h2>
            <p className="mb-3 text-xs text-[#7A9982] dark:text-[#7BA88A]">
              {task.taskStatement.slice(0, 300)}{task.taskStatement.length > 300 ? '...' : ''}
            </p>
            <pre className="max-h-[400px] overflow-auto rounded-lg bg-[#1e1e1e] p-4 text-xs text-[#d4d4d4]">
              <code>{task.code}</code>
            </pre>
          </Card>

          <Card padding="lg">
            <h2 className="mb-2 text-sm font-semibold text-[#111111] dark:text-[#E2F0E8]">
              {t('blindReview.yourReview', 'Your Code Review')}
            </h2>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder={t('blindReview.placeholder', 'What issues do you see? What would you improve? Be specific...')}
              className="h-[300px] w-full rounded-lg border border-[#C1CFC4] bg-white p-3 text-sm text-[#111111] placeholder:text-[#94a3b8] focus:border-[#059669] focus:outline-none dark:border-[#1E4035] dark:bg-[#132420] dark:text-[#E2F0E8]"
            />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[11px] text-[#7A9982] dark:text-[#7BA88A]">
                {review.length} {t('blindReview.chars', 'characters')}
              </span>
              <Button variant="primary" size="sm" onClick={submitReview} disabled={loading || review.trim().length < 10}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {t('blindReview.submit', 'Submit Review')}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {result && (
        <Card padding="lg" className="section-enter">
          <div className="flex items-center gap-3">
            <Star className={`h-8 w-8 ${scoreColor(result.aiScore)}`} />
            <div>
              <p className={`font-mono text-3xl font-bold ${scoreColor(result.aiScore)}`}>
                {result.aiScore}/10
              </p>
              <p className="text-xs text-[#7A9982] dark:text-[#7BA88A]">
                {t('blindReview.reviewScore', 'Review Quality Score')}
              </p>
            </div>
          </div>
          {result.aiFeedback && (
            <p className="mt-4 text-sm leading-relaxed text-[#4B6B52] dark:text-[#94a3b8]">
              {result.aiFeedback}
            </p>
          )}
          <Button variant="secondary" size="sm" className="mt-4" onClick={fetchTask}>
            {t('blindReview.tryAnother', 'Review another')}
          </Button>
        </Card>
      )}

      {!task && !error && (
        <Card padding="lg" className="flex flex-col items-center justify-center py-12 text-center">
          <Eye className="mb-3 h-10 w-10 text-[#C1CFC4] dark:text-[#1E4035]" />
          <p className="text-sm font-medium text-[#4B6B52] dark:text-[#94a3b8]">
            {t('blindReview.empty', 'Click "Start" to get anonymous code for review')}
          </p>
          <p className="mt-1 text-xs text-[#7A9982] dark:text-[#7BA88A]">
            {t('blindReview.emptyHint', 'AI will evaluate the quality of your code review')}
          </p>
        </Card>
      )}
    </div>
  )
}
