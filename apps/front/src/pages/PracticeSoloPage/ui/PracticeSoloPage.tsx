import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronRight, Code2, BookOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { codeRoomApi } from '@/features/CodeRoom/api/codeRoomApi'
import type { Task } from '@/entities/CodeRoom/model/types'
import { Badge } from '@/shared/ui/Badge'
import { ErrorState } from '@/shared/ui/ErrorState'
import { DIFF_LABELS, DIFF_VARIANTS } from '@/shared/lib/taskLabels'
import { useIsMobile } from '@/shared/hooks/useIsMobile'

const DIFFICULTY_FILTERS = [
  { value: '', label: 'All' },
  { value: 'TASK_DIFFICULTY_EASY', label: 'Easy' },
  { value: 'TASK_DIFFICULTY_MEDIUM', label: 'Medium' },
  { value: 'TASK_DIFFICULTY_HARD', label: 'Hard' },
]

const TOPIC_FILTERS = [
  { value: '', label: 'All' },
  { value: 'go', label: 'Go' },
  { value: 'sql', label: 'SQL' },
  { value: 'algorithms', label: 'Algorithms' },
  { value: 'system-design', label: 'System Design' },
  { value: 'concurrency', label: 'Concurrency' },
]

const DIFF_BORDER: Record<string, string> = {
  TASK_DIFFICULTY_EASY: 'border-l-[#22c55e]',
  TASK_DIFFICULTY_MEDIUM: 'border-l-[#f59e0b]',
  TASK_DIFFICULTY_HARD: 'border-l-[#ef4444]',
}

export function PracticeSoloPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [topic, setTopic] = useState('')

  const fetchTasks = useCallback(() => {
    setError(null)
    setLoading(true)
    codeRoomApi.listTasks({ difficulty: difficulty || undefined })
      .then(ts => setTasks(ts))
      .catch(() => setError(t('common.loadFailed')))
      .finally(() => setLoading(false))
  }, [difficulty, t])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      const matchesSearch = !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.topics.some(tp => tp.toLowerCase().includes(search.toLowerCase()))
      const matchesTopic = !topic || t.topics.some(tp => tp.toLowerCase().includes(topic.toLowerCase()))
      return matchesSearch && matchesTopic
    })
  }, [tasks, search, topic])

  const { topicCounts, difficultyCounts } = useMemo(() => {
    const topicSet = new Set(TOPIC_FILTERS.filter(f => f.value).map(f => f.value.toLowerCase()))
    const tCounts: Record<string, number> = { '': tasks.length }
    const base = topic ? filtered : tasks
    const dCounts: Record<string, number> = { '': base.length }

    for (const t of tasks) {
      for (const tp of t.topics) {
        const lower = tp.toLowerCase()
        for (const tv of topicSet) {
          if (lower.includes(tv)) tCounts[tv] = (tCounts[tv] ?? 0) + 1
        }
      }
    }
    for (const t of base) {
      if (t.difficulty) dCounts[t.difficulty] = (dCounts[t.difficulty] ?? 0) + 1
    }
    return { topicCounts: tCounts, difficultyCounts: dCounts }
  }, [tasks, filtered, topic])

  const handleStartSolo = async (task: Task) => {
    try {
      const { room } = await codeRoomApi.createRoom({ mode: 'ROOM_MODE_ALL', task: task.title })
      navigate(`/code-rooms/${room.id}`, {
        state: { title: task.title, statement: task.statement, starterCode: task.starterCode, language: task.language, taskId: task.id },
      })
    } catch {}
  }

  if (error) return <ErrorState message={error} onRetry={() => { setError(null); fetchTasks() }} />

  return (
    <div className="px-4 pt-4 pb-6 md:px-6">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#111111] dark:text-[#E2F0E8]">{t('solo.title')}</h1>
          <p className="mt-1 text-sm text-[#7A9982] dark:text-[#7BA88A]">{t('solo.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-[#C1CFC4] bg-white px-4 py-2 dark:border-[#163028] dark:bg-[#132420]">
          <Code2 className="h-4 w-4 text-[#059669]" />
          <span className="text-sm font-semibold text-[#111111] dark:text-[#E2F0E8]">{loading ? '—' : filtered.length}</span>
          <span className="text-xs text-[#7A9982] dark:text-[#7BA88A]">{t('solo.tasks')}</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('solo.searchPlaceholder')}
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#C1CFC4] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#059669]/20 dark:bg-[#132420] dark:border-[#163028] dark:text-[#E2F0E8] dark:placeholder-[#4d6380]"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-[#4B6B52] dark:text-[#7BA88A] mr-1">{t('solo.topic')}:</span>
          {TOPIC_FILTERS.map(tf => (
            <button
              key={tf.value}
              onClick={() => setTopic(tf.value)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ${
                topic === tf.value
                  ? 'bg-[#059669] text-white shadow-sm'
                  : 'bg-[#F0F5F1] dark:bg-[#162E24] text-[#4B6B52] dark:text-[#4A7058] hover:bg-[#E4EBE5] dark:hover:bg-[#1e2d45] hover:text-[#111111] dark:hover:text-[#C1D9CA]'
              }`}
            >
              {tf.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                topic === tf.value ? 'bg-white/20 text-white' : 'bg-[#C1CFC4]/50 text-[#94a3b8]'
              }`}>
                {topicCounts[tf.value] ?? 0}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-[#4B6B52] dark:text-[#7BA88A] mr-1">{t('solo.difficulty')}:</span>
          {DIFFICULTY_FILTERS.map(df => (
            <button
              key={df.value}
              onClick={() => setDifficulty(df.value)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ${
                difficulty === df.value
                  ? 'bg-[#111111] text-white shadow-sm dark:bg-white dark:text-[#111111]'
                  : 'bg-[#F0F5F1] dark:bg-[#162E24] text-[#4B6B52] dark:text-[#4A7058] hover:bg-[#E4EBE5] dark:hover:bg-[#1e2d45] hover:text-[#111111] dark:hover:text-[#C1D9CA]'
              }`}
            >
              {df.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                difficulty === df.value ? 'bg-white/20 text-white dark:bg-black/20 dark:text-[#111111]' : 'bg-[#C1CFC4]/50 text-[#94a3b8]'
              }`}>
                {difficultyCounts[df.value] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Task list */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-[#C1CFC4] bg-white p-4 animate-pulse dark:border-[#163028] dark:bg-[#132420]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E4EBE5] dark:bg-[#1E4035]" />
                <div className="flex-1">
                  <div className="h-4 w-48 bg-[#E4EBE5] rounded dark:bg-[#1E4035]" />
                  <div className="h-3 w-32 bg-[#E4EBE5] rounded mt-2 dark:bg-[#1E4035]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#C1CFC4] bg-white py-16 text-center dark:border-[#163028] dark:bg-[#132420]">
          <BookOpen className="mx-auto h-10 w-10 text-[#C1CFC4] dark:text-[#4A7058]" />
          <p className="mt-3 text-sm font-medium text-[#7A9982] dark:text-[#7BA88A]">{t('solo.emptyTitle')}</p>
          <p className="mt-1 text-xs text-[#94a3b8]">{t('solo.emptyBody')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((task, i) => {
            const borderColor = DIFF_BORDER[task.difficulty] ?? 'border-l-[#C1CFC4]'
            return (
              <button
                key={task.id}
                onClick={() => handleStartSolo(task)}
                className={`group flex items-center gap-4 rounded-2xl border border-[#C1CFC4] border-l-[3px] ${borderColor} bg-white px-4 py-3.5 text-left transition-all hover:shadow-md hover:border-[#059669]/40 dark:border-[#163028] dark:bg-[#132420] dark:hover:border-[#059669]/40 ${isMobile ? 'flex-col items-start gap-3' : ''}`}
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#F0F5F1] text-sm font-mono font-bold text-[#7A9982] dark:bg-[#162E24] dark:text-[#7BA88A]">
                  {i + 1}
                </div>

                <div className={`flex-1 min-w-0 ${isMobile ? 'w-full' : ''}`}>
                  <p className="text-sm font-semibold text-[#111111] dark:text-[#E2F0E8] group-hover:text-[#059669] transition-colors truncate">
                    {task.title}
                  </p>
                  {task.topics.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {task.topics.slice(0, 3).map(tp => (
                        <span key={tp} className="inline-flex items-center rounded-md bg-[#F0F5F1] px-2 py-0.5 text-[11px] font-medium text-[#4B6B52] dark:bg-[#162E24] dark:text-[#7BA88A]">
                          {tp}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className={`flex items-center gap-3 flex-shrink-0 ${isMobile ? 'w-full justify-between' : ''}`}>
                  {task.difficulty && task.difficulty !== 'TASK_DIFFICULTY_UNSPECIFIED' && (
                    <Badge variant={DIFF_VARIANTS[task.difficulty] ?? 'default'}>
                      {DIFF_LABELS[task.difficulty] ?? task.difficulty}
                    </Badge>
                  )}
                  {task.language && (
                    <span className="text-[11px] font-medium text-[#94a3b8] dark:text-[#4A7058] uppercase tracking-wide">
                      {task.language}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-[#C1CFC4] group-hover:text-[#059669] transition-colors dark:text-[#4A7058]" />
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
