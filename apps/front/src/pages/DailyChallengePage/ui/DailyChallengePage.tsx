import { useEffect, useState, useCallback, useRef } from 'react'
import { Calendar, Clock } from 'lucide-react'
import Editor from '@monaco-editor/react'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { apiClient } from '@/shared/api/base'
import { useTheme } from '@/app/providers/ThemeProvider'
import { useTranslation } from 'react-i18next'
import { registerDarkTheme } from '@/shared/lib/monacoTheme'
import { registerFormatKeybinding } from '@/shared/lib/editorFormat'
import { DIFF_LABELS, DIFF_VARIANTS } from '@/shared/lib/taskLabels'
import { formatDateRu } from '@/shared/lib/dateFormat'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import { PageMeta } from '@/shared/ui/PageMeta'
import type * as Monaco from 'monaco-editor'

interface DailyTask {
  task: {
    id: string
    title: string
    slug: string
    statement: string
    difficulty: string
    language: string
    starterCode: string
    topics: string[]
  }
  date: string
  expiresAt: string
}

const LANG_MAP: Record<string | number, string> = {
  1: 'python', 2: 'javascript', 3: 'typescript', 4: 'go', 5: 'rust', 6: 'java',
  python: 'python', go: 'go', javascript: 'javascript', typescript: 'typescript',
}

function normalizeTask(raw: any): DailyTask {
  const t = raw.task ?? {}
  return {
    date: raw.date ?? raw.Date ?? '',
    expiresAt: raw.expiresAt ?? '',
    task: {
      id: t.id ?? t.ID ?? '',
      title: t.title ?? t.Title ?? '',
      slug: t.slug ?? t.Slug ?? '',
      statement: t.statement ?? t.Statement ?? '',
      difficulty: String(t.difficulty ?? t.Difficulty ?? ''),
      language: LANG_MAP[t.language ?? t.Language ?? ''] ?? 'go',
      starterCode: t.starterCode ?? t.StarterCode ?? '',
      topics: t.topics ?? t.Topics ?? [],
    },
  }
}

export function DailyChallengePage() {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const isMobile = useIsMobile()
  const [task, setTask] = useState<DailyTask | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [code, setCode] = useState('')
  const [timeLeft, setTimeLeft] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const [review, setReview] = useState<any>(null)
  const saveDraftTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clean up draft save timer on unmount
  useEffect(() => () => {
    if (saveDraftTimer.current) clearTimeout(saveDraftTimer.current)
  }, [])

  // Fetch daily task, restore draft + review from localStorage
  useEffect(() => {
    apiClient.get('/api/v1/code-editor/daily')
      .then(res => {
        const normalized = normalizeTask(res.data)
        setTask(normalized)
        const id = normalized.task.id
        if (id) {
          const codeKey = `daily:code:${id}`
          const reviewKey = `daily:review:${id}`
          const savedCode = localStorage.getItem(codeKey)
          const savedReview = localStorage.getItem(reviewKey)
          setCode(savedCode ?? normalized.task.starterCode ?? '')
          if (savedReview) {
            try {
              const parsed = JSON.parse(savedReview)
              setReview(parsed)
            } catch { /* ignore corrupt cache */ }
          }
          // Purge stale entries from previous days
          Object.keys(localStorage)
            .filter(k => (k.startsWith('daily:code:') && k !== codeKey) || (k.startsWith('daily:review:') && k !== reviewKey))
            .forEach(k => localStorage.removeItem(k))
        } else {
          setCode(normalized.task.starterCode ?? '')
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  // Countdown timer
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const midnight = new Date(now)
      midnight.setUTCHours(24, 0, 0, 0)
      const diff = midnight.getTime() - now.getTime()
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
      )
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleSubmit = async () => {
    setReviewing(true)
    try {
      const res = await apiClient.post('/api/v1/code-editor/ai-review', {
        language: task?.task.language ?? 'python',
        code,
        taskTitle: task?.task.title ?? '',
        statement: task?.task.statement ?? '',
      })
      const reviewData = res.data?.review ?? res.data
      setReview(reviewData)
      if (task?.task.id) {
        try { localStorage.setItem(`daily:review:${task.task.id}`, JSON.stringify(reviewData)) } catch { /* quota */ }
      }
    } catch {
      setReview(null)
    } finally {
      setReviewing(false)
    }
  }

  const handleEditorMount = useCallback((editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof import('monaco-editor')) => {
    registerDarkTheme(monaco)
    registerFormatKeybinding(editor, monaco)
    monaco.editor.setTheme(theme === 'dark' ? 'druzya-dark' : 'vs')
  }, [theme])

  const today = formatDateRu(task?.date ?? new Date().toISOString())
  const langExt = task?.task.language === 'python' ? 'py'
    : task?.task.language === 'javascript' ? 'js'
    : task?.task.language === 'typescript' ? 'ts'
    : (task?.task.language ?? 'go')

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-4 pb-24 md:px-6 md:pb-6">
      <PageMeta title={t('daily.meta.title')} description={t('daily.meta.description')} canonicalPath="/daily-challenge" />
      {/* Header bar — full width */}
      <div className={`mb-4 bg-white border dark:bg-[#0f172a] dark:border-[#1e3158] px-5 py-4 ${
        isMobile
          ? 'flex flex-col items-start gap-4 rounded-[28px] border-[#d8d9d6] shadow-[0_16px_30px_rgba(15,23,42,0.06)]'
          : 'flex items-center justify-between rounded-2xl border-[#CBCCC9]'
      }`}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#EEF2FF] dark:bg-[#1e2a4a] rounded-lg flex items-center justify-center">
            <Calendar className="w-4 h-4 text-[#6366F1]" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[#111111] dark:text-[#f8fafc] leading-tight">{t('daily.title')}</h1>
            <p className="text-xs text-[#666666] dark:text-[#94a3b8]">{today}</p>
          </div>
        </div>
        <div className={`flex items-center gap-2 rounded-lg bg-[#F2F3F0] dark:bg-[#1e293b] px-3 py-2 ${isMobile ? 'self-stretch justify-center' : ''}`}>
          <Clock className="w-3.5 h-3.5 text-[#666666] dark:text-[#94a3b8]" />
          <span className="text-sm font-mono font-semibold text-[#111111] dark:text-[#f8fafc]">{timeLeft}</span>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className={isMobile ? 'flex flex-col gap-4' : 'grid grid-cols-[1fr_360px] gap-4'}>
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-2xl border border-[#CBCCC9] p-5 animate-pulse">
              <div className="flex items-center justify-between mb-3">
                <div className="h-5 w-48 bg-[#E7E8E5] rounded" />
                <div className="h-5 w-16 bg-[#E7E8E5] rounded-full" />
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-[#E7E8E5] rounded w-full" />
                <div className="h-3 bg-[#E7E8E5] rounded w-5/6" />
                <div className="h-3 bg-[#E7E8E5] rounded w-4/6" />
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-[#CBCCC9] animate-pulse">
              <div className="h-9 bg-[#E7E8E5]" />
              <div className="h-[400px] bg-[#F2F3F0]" />
            </div>
          </div>
          {!isMobile && <div className="bg-white rounded-2xl border border-[#CBCCC9] animate-pulse h-48" />}
        </div>
      ) : error ? (
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#CBCCC9] dark:border-[#1e3158] p-12 text-center">
          <p className="text-sm text-[#94a3b8]">{t('daily.comingSoon')}</p>
        </div>
      ) : task ? (
        isMobile ? (
          /* ── Mobile: single column ── */
          <div className="flex flex-col gap-4">
            <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#CBCCC9] dark:border-[#1e3158] p-5">
              <div className="flex flex-col items-start gap-2 mb-3">
                <h2 className="text-base font-bold text-[#111111] dark:text-[#f8fafc]">{task.task.title}</h2>
                {task.task.difficulty && task.task.difficulty !== 'TASK_DIFFICULTY_UNSPECIFIED' && (
                  <Badge variant={DIFF_VARIANTS[task.task.difficulty] ?? 'default'}>
                    {DIFF_LABELS[task.task.difficulty] ?? task.task.difficulty}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed whitespace-pre-wrap">{task.task.statement}</p>
            </div>
            <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#CBCCC9] dark:border-[#1e3158] overflow-hidden">
              <div className="h-9 bg-[#1e293b] flex items-center px-4">
                <span className="text-xs text-[#94a3b8] font-mono">solution.{langExt}</span>
              </div>
              <Editor
                height="340px"
                language={task.task.language}
                value={code}
                onChange={v => {
                  const next = v ?? ''
                  setCode(next)
                  if (task.task.id) {
                    if (saveDraftTimer.current) clearTimeout(saveDraftTimer.current)
                    saveDraftTimer.current = setTimeout(() => { localStorage.setItem(`daily:code:${task.task.id}`, next) }, 1000)
                  }
                }}
                onMount={handleEditorMount}
                theme={theme === 'dark' ? 'druzya-dark' : 'vs'}
                options={{ fontSize: 13, fontFamily: '"JetBrains Mono", monospace', minimap: { enabled: false }, scrollBeyondLastLine: false, lineNumbers: 'on', padding: { top: 12 } }}
              />
            </div>
            <Button variant="orange" size="md" onClick={handleSubmit} loading={reviewing} disabled={!code.trim()} className="w-full justify-center rounded-2xl">
              {t('daily.submit')}
            </Button>
            <ReviewPanel review={review} reviewing={reviewing} />
          </div>
        ) : (
          /* ── Desktop: 2-column ── */
          <div className="grid grid-cols-[1fr_360px] gap-4 items-start">
            {/* Left column: task + editor + submit */}
            <div className="flex flex-col gap-4">
              <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#CBCCC9] dark:border-[#1e3158] p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h2 className="text-base font-bold text-[#111111] dark:text-[#f8fafc]">{task.task.title}</h2>
                  {task.task.difficulty && task.task.difficulty !== 'TASK_DIFFICULTY_UNSPECIFIED' && (
                    <Badge variant={DIFF_VARIANTS[task.task.difficulty] ?? 'default'}>
                      {DIFF_LABELS[task.task.difficulty] ?? task.task.difficulty}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-[#475569] dark:text-[#94a3b8] leading-relaxed whitespace-pre-wrap">{task.task.statement}</p>
              </div>

              <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#CBCCC9] dark:border-[#1e3158] overflow-hidden">
                <div className="h-9 bg-[#1e293b] flex items-center justify-between px-4">
                  <span className="text-xs text-[#94a3b8] font-mono">solution.{langExt}</span>
                  <span className="text-[10px] text-[#475569] uppercase tracking-widest">{task.task.language}</span>
                </div>
                <Editor
                  height="460px"
                  language={task.task.language}
                  value={code}
                  onChange={v => {
                    const next = v ?? ''
                    setCode(next)
                    if (task.task.id) {
                      if (saveDraftTimer.current) clearTimeout(saveDraftTimer.current)
                      saveDraftTimer.current = setTimeout(() => { localStorage.setItem(`daily:code:${task.task.id}`, next) }, 1000)
                    }
                  }}
                  onMount={handleEditorMount}
                  theme={theme === 'dark' ? 'druzya-dark' : 'vs'}
                  options={{ fontSize: 13, fontFamily: '"JetBrains Mono", monospace', minimap: { enabled: false }, scrollBeyondLastLine: false, lineNumbers: 'on', padding: { top: 12 } }}
                />
              </div>

              <Button variant="orange" size="md" onClick={handleSubmit} loading={reviewing} disabled={!code.trim()}>
                {t('daily.submit')}
              </Button>
            </div>

            {/* Right column: AI Review */}
            <div className="sticky top-4">
              <ReviewPanel review={review} reviewing={reviewing} />
            </div>
          </div>
        )
      ) : null}
    </div>
  )
}

/* ── ReviewPanel sub-component ── */
function ReviewPanel({ review, reviewing }: { review: any; reviewing: boolean }) {
  const { t } = useTranslation()
  if (reviewing) {
    return (
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#CBCCC9] dark:border-[#1e3158] p-5 flex items-center gap-3">
        <Spinner size="sm" />
        <p className="text-sm text-[#666666] dark:text-[#94a3b8]">{t('daily.review.analyzing')}</p>
      </div>
    )
  }
  if (!review) {
    return (
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#CBCCC9] dark:border-[#1e3158] p-6 flex flex-col items-center gap-3 text-center">
        <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] dark:bg-[#1e2a4a] flex items-center justify-center">
          <span className="text-lg">✦</span>
        </div>
        <p className="text-sm font-medium text-[#111111] dark:text-[#f8fafc]">{t('daily.review.title')}</p>
        <p className="text-xs text-[#94a3b8] leading-relaxed">{t('daily.review.empty')}</p>
      </div>
    )
  }
  return (
    <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#CBCCC9] dark:border-[#1e3158] p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#111111] dark:text-[#f8fafc]">{t('daily.review.title')}</h3>
        {review.score != null && (
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
            review.score >= 8 ? 'bg-[#dcfce7] text-[#16a34a]'
            : review.score >= 5 ? 'bg-[#fef9c3] text-[#854d0e]'
            : 'bg-[#fee2e2] text-[#dc2626]'
          }`}>{review.score}/10</span>
        )}
      </div>
      {(review.summary ?? review.review ?? review.feedback) && (
        <p className="text-xs text-[#475569] dark:text-[#94a3b8] leading-relaxed whitespace-pre-wrap">
          {review.summary ?? review.review ?? review.feedback}
        </p>
      )}
      {Array.isArray(review.strengths) && review.strengths.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-[#16a34a] uppercase tracking-widest mb-2">{t('daily.review.strengths')}</p>
          <ul className="flex flex-col gap-1.5">
            {review.strengths.map((s: string, i: number) => (
              <li key={i} className="text-xs text-[#475569] dark:text-[#94a3b8] flex gap-2">
                <span className="text-[#16a34a] flex-shrink-0 mt-px">✓</span>{s}
              </li>
            ))}
          </ul>
        </div>
      )}
      {Array.isArray(review.issues) && review.issues.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-[#dc2626] uppercase tracking-widest mb-2">{t('daily.review.issues')}</p>
          <ul className="flex flex-col gap-1.5">
            {review.issues.map((s: string, i: number) => (
              <li key={i} className="text-xs text-[#475569] dark:text-[#94a3b8] flex gap-2">
                <span className="text-[#dc2626] flex-shrink-0 mt-px">✗</span>{s}
              </li>
            ))}
          </ul>
        </div>
      )}
      {Array.isArray(review.followUpQuestions) && review.followUpQuestions.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-[#6366F1] uppercase tracking-widest mb-2">{t('daily.review.followups')}</p>
          <ul className="flex flex-col gap-1.5">
            {review.followUpQuestions.map((q: string, i: number) => (
              <li key={i} className="text-xs text-[#475569] dark:text-[#94a3b8] flex gap-2">
                <span className="text-[#6366F1] flex-shrink-0 mt-px">?</span>{q}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
