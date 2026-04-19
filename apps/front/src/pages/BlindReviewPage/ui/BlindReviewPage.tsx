import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Panel, RpgButton, Badge, PageHeader } from '@/shared/ui/pixel'
import { apiClient } from '@/shared/api/base'
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

function scoreColor(score: number): string {
  if (score >= 8) return 'var(--moss-1)'
  if (score >= 5) return 'var(--ember-1)'
  return 'var(--rpg-danger, #a23a2a)'
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

  return (
    <>
      <PageMeta
        title={t('blindReview.meta.title', 'Blind Review')}
        description={t('blindReview.meta.desc', 'Review anonymous code and get AI feedback')}
        canonicalPath="/practice/blind-review"
      />
      <PageHeader
        eyebrow="Workshop · blind review"
        title={t('blindReview.title', 'Blind Code Review')}
        subtitle={t('blindReview.subtitle', 'Review anonymous code. AI evaluates the quality of your review.')}
        right={
          <RpgButton size="sm" variant="primary" onClick={() => void fetchTask()} disabled={fetchingTask}>
            {fetchingTask ? 'Loading…' : task ? t('blindReview.next', 'Next →') : t('blindReview.start', '👁 Start')}
          </RpgButton>
        }
      />

      {error && (
        <Panel style={{ marginBottom: 18, borderColor: 'var(--rpg-danger, #a23a2a)' }}>
          <div style={{ color: 'var(--rpg-danger, #a23a2a)', fontSize: 13 }}>{error}</div>
        </Panel>
      )}

      {!task && !error && (
        <Panel>
          <div style={{ padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>👁</div>
            <div
              style={{ fontFamily: 'Pixelify Sans, Unbounded, monospace', fontSize: 14, color: 'var(--ink-1)', marginBottom: 4 }}
            >
              {t('blindReview.empty', 'Click "Start" to get anonymous code for review')}
            </div>
            <div
              className="font-silkscreen uppercase"
              style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
            >
              {t('blindReview.emptyHint', 'AI will evaluate the quality of your code review')}
            </div>
          </div>
        </Panel>
      )}

      {task && !result && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 18 }}>
          {/* Anonymous code */}
          <Panel>
            <h2 className="font-display" style={{ fontSize: 17, margin: '0 0 6px' }}>
              {task.taskTitle}
            </h2>
            <div style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 10, lineHeight: 1.5 }}>
              {task.taskStatement.slice(0, 300)}
              {task.taskStatement.length > 300 && '…'}
            </div>
            <pre
              style={{
                maxHeight: 400,
                overflow: 'auto',
                padding: 12,
                background: '#1e1e1e',
                color: '#d4d4d4',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 12,
                lineHeight: 1.5,
                border: '2px solid var(--ink-0)',
                margin: 0,
              }}
            >
              <code>{task.code}</code>
            </pre>
          </Panel>

          {/* Your review */}
          <Panel>
            <h2 className="font-display" style={{ fontSize: 17, margin: '0 0 10px' }}>
              {t('blindReview.yourReview', 'Your Code Review')}
            </h2>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder={t(
                'blindReview.placeholder',
                'What issues do you see? What would you improve? Be specific…',
              )}
              style={{
                height: 300,
                width: '100%',
                padding: 12,
                background: 'var(--parch-0)',
                border: '3px solid var(--ink-0)',
                fontFamily: 'Pixelify Sans, Unbounded, monospace',
                fontSize: 13,
                color: 'var(--ink-0)',
                outline: 'none',
                resize: 'vertical',
                boxShadow: 'inset 2px 2px 0 var(--parch-3)',
                boxSizing: 'border-box',
              }}
            />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 12,
              }}
            >
              <span
                className="font-silkscreen uppercase"
                style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
              >
                {review.length} {t('blindReview.chars', 'characters')}
              </span>
              <RpgButton
                size="sm"
                variant="primary"
                onClick={() => void submitReview()}
                disabled={loading || review.trim().length < 10}
              >
                {loading ? 'Sending…' : t('blindReview.submit', 'Submit Review')}
              </RpgButton>
            </div>
          </Panel>
        </div>
      )}

      {result && (
        <Panel>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
            <div style={{ fontSize: 36 }}>★</div>
            <div>
              <div
                style={{
                  fontFamily: 'Pixelify Sans, Unbounded, monospace',
                  fontSize: 32,
                  color: scoreColor(result.aiScore),
                  lineHeight: 1,
                }}
              >
                {result.aiScore}/10
              </div>
              <div
                className="font-silkscreen uppercase"
                style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em', marginTop: 2 }}
              >
                {t('blindReview.reviewScore', 'Review Quality Score')}
              </div>
            </div>
            <div style={{ flex: 1 }} />
            <Badge variant={result.aiScore >= 8 ? 'moss' : result.aiScore >= 5 ? 'ember' : 'dark'}>
              {result.aiScore >= 8 ? 'excellent' : result.aiScore >= 5 ? 'solid' : 'needs work'}
            </Badge>
          </div>
          {result.aiFeedback && (
            <div
              style={{
                fontSize: 13,
                color: 'var(--ink-1)',
                lineHeight: 1.6,
                background: 'var(--parch-2)',
                padding: 14,
                border: '2px solid var(--ink-0)',
                marginBottom: 14,
              }}
            >
              {result.aiFeedback}
            </div>
          )}
          <RpgButton variant="ghost" onClick={() => void fetchTask()}>
            {t('blindReview.tryAnother', 'Review another')}
          </RpgButton>
        </Panel>
      )}
    </>
  )
}
