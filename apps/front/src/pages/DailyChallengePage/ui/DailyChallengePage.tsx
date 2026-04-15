import { useEffect, useState, useCallback, useRef } from 'react'
import { Calendar, Clock } from 'lucide-react'
import Editor from '@monaco-editor/react'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { apiClient } from '@/shared/api/base'
import { useTheme } from '@/app/providers/ThemeProvider'
import { registerDarkTheme } from '@/shared/lib/monacoTheme'
import { DIFF_LABELS, DIFF_VARIANTS } from '@/shared/lib/taskLabels'
import { formatDateRu } from '@/shared/lib/dateFormat'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
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
  const { theme } = useTheme()
  const isMobile = useIsMobile()
  const [task, setTask] = useState<DailyTask | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [code, setCode] = useState('')
  const [timeLeft, setTimeLeft] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const [review, setReview] = useState<any>(null)
  const [submitted, setSubmitted] = useState(false)
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
              setSubmitted(true)
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
      setSubmitted(true)
      if (task?.task.id) {
        try { localStorage.setItem(`daily:review:${task.task.id}`, JSON.stringify(reviewData)) } catch { /* quota */ }
      }
    } catch {
      setSubmitted(false)
    } finally {
      setReviewing(false)
    }
  }

  const handleEditorMount = useCallback((_editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof import('monaco-editor')) => {
    registerDarkTheme(monaco)
    monaco.editor.setTheme(theme === 'dark' ? 'druzya-dark' : 'vs')
  }, [theme])

  const today = formatDateRu(task?.date ?? new Date().toISOString())
  const editorHeight = isMobile ? 340 : 400

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pt-4 pb-24 md:px-6 md:pb-6">
      {/* Header */}
      <div className={`mb-4 bg-white border px-5 py-4 ${isMobile ? 'flex flex-col items-start gap-4 rounded-[28px] border-[#d8d9d6] shadow-[0_16px_30px_rgba(15,23,42,0.06)]' : 'flex items-center justify-between rounded-2xl border-[#CBCCC9]'}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#FFF7ED] rounded-lg flex items-center justify-center">
            <Calendar className="w-4 h-4 text-[#6366F1]" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[#111111] leading-tight">Задача дня</h1>
            <p className="text-xs text-[#666666]">{today}</p>
          </div>
        </div>
        <div className={`flex items-center gap-2 rounded-lg bg-[#F2F3F0] px-3 py-2 ${isMobile ? 'self-stretch justify-center' : ''}`}>
          <Clock className="w-3.5 h-3.5 text-[#666666]" />
          <span className="text-sm font-mono font-semibold text-[#111111]">{timeLeft}</span>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col gap-4">
          {/* Skeleton: task description */}
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
          {/* Skeleton: editor */}
          <div className="bg-white rounded-2xl border border-[#CBCCC9] p-5 animate-pulse">
            <div className="h-[400px] bg-[#E7E8E5] rounded-lg" />
          </div>
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-[#CBCCC9] p-12 text-center">
          <p className="text-sm text-[#94a3b8]">Задача дня скоро появится</p>
        </div>
      ) : task ? (
        <div className="flex flex-col gap-4">
          {/* Task info */}
          <div className="bg-white rounded-2xl border border-[#CBCCC9] p-5">
            <div className={`mb-3 gap-3 ${isMobile ? 'flex flex-col items-start' : 'flex items-start justify-between'}`}>
              <h2 className="text-base font-bold text-[#111111]">{task.task.title}</h2>
              {task.task.difficulty && task.task.difficulty !== 'TASK_DIFFICULTY_UNSPECIFIED' && (
                <Badge variant={DIFF_VARIANTS[task.task.difficulty] ?? 'default'}>
                  {DIFF_LABELS[task.task.difficulty] ?? task.task.difficulty}
                </Badge>
              )}
            </div>
            <p className="text-sm text-[#475569] leading-relaxed whitespace-pre-wrap">
              {task.task.statement}
            </p>
          </div>

          {/* Monaco editor */}
          <div className="bg-white rounded-2xl border border-[#CBCCC9] overflow-hidden">
            <div className="h-9 bg-[#1e293b] flex items-center px-4">
              <span className="text-xs text-[#94a3b8] font-mono">
                solution.{task.task.language === 'python' ? 'py' : task.task.language === 'javascript' ? 'js' : task.task.language === 'typescript' ? 'ts' : task.task.language}
              </span>
            </div>
            <div style={{ minHeight: editorHeight }}>
              <Editor
                height={`${editorHeight}px`}
                language={task.task.language}
                value={code}
                onChange={v => {
                  const next = v ?? ''
                  setCode(next)
                  if (task.task.id) {
                    if (saveDraftTimer.current) clearTimeout(saveDraftTimer.current)
                    saveDraftTimer.current = setTimeout(() => {
                      localStorage.setItem(`daily:code:${task.task.id}`, next)
                    }, 1000)
                  }
                }}
                onMount={handleEditorMount}
                theme={theme === 'dark' ? 'druzya-dark' : 'vs'}
                options={{
                  fontSize: 13,
                  fontFamily: '"JetBrains Mono", monospace',
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  lineNumbers: 'on',
                  padding: { top: 12 },
                }}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <Button
              variant="orange"
              size="md"
              onClick={handleSubmit}
              loading={reviewing}
              disabled={!code.trim()}
              className={isMobile ? 'w-full justify-center rounded-2xl' : ''}
            >
              Отправить решение
            </Button>
          </div>

          {/* Submitted notice */}
          {submitted && !reviewing && !review && (
            <div className="bg-[#e8f9ef] border border-[#86efac] rounded-xl p-4">
              <p className="text-sm text-[#166534] font-medium">Решение отправлено!</p>
            </div>
          )}

          {/* AI Review panel */}
          {reviewing && (
            <div className="bg-white rounded-xl border border-[#CBCCC9] p-4 flex items-center gap-3">
              <Spinner size="sm" />
              <p className="text-sm text-[#666666]">Анализируем решение...</p>
            </div>
          )}

          {review && (
            <div className="bg-white rounded-xl border border-[#CBCCC9] p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#111111]">AI Ревью</h3>
                {review.score != null && (
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    review.score >= 8 ? 'bg-[#dcfce7] text-[#16a34a]'
                    : review.score >= 5 ? 'bg-[#fef9c3] text-[#854d0e]'
                    : 'bg-[#fee2e2] text-[#dc2626]'
                  }`}>{review.score}/10</span>
                )}
              </div>
              {(review.summary ?? review.review ?? review.feedback) && (
                <p className="text-xs text-[#475569] leading-relaxed whitespace-pre-wrap">
                  {review.summary ?? review.review ?? review.feedback}
                </p>
              )}
              {Array.isArray(review.strengths) && review.strengths.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-[#16a34a] uppercase tracking-wide mb-1">Сильные стороны</p>
                  <ul className="flex flex-col gap-1">
                    {review.strengths.map((s: string, i: number) => (
                      <li key={i} className="text-xs text-[#475569] flex gap-2"><span className="text-[#16a34a] flex-shrink-0">✓</span>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {Array.isArray(review.issues) && review.issues.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-[#dc2626] uppercase tracking-wide mb-1">Замечания</p>
                  <ul className="flex flex-col gap-1">
                    {review.issues.map((s: string, i: number) => (
                      <li key={i} className="text-xs text-[#475569] flex gap-2"><span className="text-[#dc2626] flex-shrink-0">✗</span>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {Array.isArray(review.followUpQuestions) && review.followUpQuestions.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-[#6366F1] uppercase tracking-wide mb-1">Вопросы для углубления</p>
                  <ul className="flex flex-col gap-1">
                    {review.followUpQuestions.map((q: string, i: number) => (
                      <li key={i} className="text-xs text-[#475569] flex gap-2"><span className="text-[#6366F1] flex-shrink-0">?</span>{q}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
