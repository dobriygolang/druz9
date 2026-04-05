import { useEffect, useState } from 'react'
import { Calendar, Clock } from 'lucide-react'
import Editor from '@monaco-editor/react'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { apiClient } from '@/shared/api/base'

interface DailyTask {
  task: {
    id: string
    title: string
    slug: string
    statement: string
    difficulty: string
    language: string
  }
  date: string
  expires_at: string
}

const DIFF_LABELS: Record<string, string> = {
  TASK_DIFFICULTY_EASY: 'Easy',
  TASK_DIFFICULTY_MEDIUM: 'Medium',
  TASK_DIFFICULTY_HARD: 'Hard',
}

const DIFF_VARIANTS: Record<string, 'success' | 'warning' | 'danger'> = {
  TASK_DIFFICULTY_EASY: 'success',
  TASK_DIFFICULTY_MEDIUM: 'warning',
  TASK_DIFFICULTY_HARD: 'danger',
}

function formatDateRu(dateStr: string): string {
  const months = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
  ]
  const d = dateStr ? new Date(dateStr) : new Date()
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

export function DailyChallengePage() {
  const [task, setTask] = useState<DailyTask | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [code, setCode] = useState('')
  const [timeLeft, setTimeLeft] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const [review, setReview] = useState<any>(null)
  const [submitted, setSubmitted] = useState(false)

  // Fetch daily task
  useEffect(() => {
    apiClient.get('/api/v1/code-editor/daily')
      .then(res => {
        setTask(res.data)
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
    setSubmitted(true)
    try {
      const res = await apiClient.post('/api/v1/code-editor/ai-review', {
        language: task?.task.language ?? 'python',
        code,
        task_title: task?.task.title ?? '',
        statement: task?.task.statement ?? '',
      })
      setReview(res.data)
    } catch {
      // keep submitted=true, review stays null
    } finally {
      setReviewing(false)
    }
  }

  const today = formatDateRu(task?.date ?? new Date().toISOString())

  return (
    <div className="px-6 pt-4 pb-6 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-[#CBCCC9] px-5 py-4 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#FFF7ED] rounded-lg flex items-center justify-center">
            <Calendar className="w-4 h-4 text-[#6366F1]" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[#111111] leading-tight">Задача дня</h1>
            <p className="text-xs text-[#666666]">{today}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-[#F2F3F0] rounded-lg px-3 py-2">
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
            <div className="flex items-start justify-between gap-3 mb-3">
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
                solution.{task.task.language === 'python' ? 'py' : task.task.language === 'go' ? 'go' : task.task.language ?? 'py'}
              </span>
            </div>
            <div style={{ minHeight: 400 }}>
              <Editor
                height="400px"
                language={task.task.language === 'python' ? 'python' : task.task.language === 'go' ? 'go' : task.task.language ?? 'python'}
                value={code}
                onChange={v => setCode(v ?? '')}
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
            <div className="bg-white rounded-xl border border-[#CBCCC9] p-4">
              <h3 className="text-sm font-semibold mb-2">AI Ревью</h3>
              <p className="text-xs text-[#666666] whitespace-pre-wrap">
                {review.review ?? review.feedback ?? JSON.stringify(review)}
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
