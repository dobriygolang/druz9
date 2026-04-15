import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronRight, Code2, BookOpen } from 'lucide-react'
import { codeRoomApi } from '@/features/CodeRoom/api/codeRoomApi'
import type { Task } from '@/entities/CodeRoom/model/types'
import { Badge } from '@/shared/ui/Badge'
import { ErrorState } from '@/shared/ui/ErrorState'
import { DIFF_LABELS, DIFF_VARIANTS } from '@/shared/lib/taskLabels'
import { useIsMobile } from '@/shared/hooks/useIsMobile'

const DIFFICULTY_FILTERS = [
  { value: '', label: 'Все' },
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
      .catch(() => setError('Не удалось загрузить данные'))
      .finally(() => setLoading(false))
  }, [difficulty])

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
          <h1 className="text-xl font-bold text-[#111111] dark:text-[#f8fafc]">Solo Practice</h1>
          <p className="mt-1 text-sm text-[#667085] dark:text-[#7e93b0]">Выбери задачу и начни тренировку</p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-[#CBCCC9] bg-white px-4 py-2 dark:border-[#1a2540] dark:bg-[#161c2d]">
          <Code2 className="h-4 w-4 text-[#6366F1]" />
          <span className="text-sm font-semibold text-[#111111] dark:text-[#f8fafc]">{loading ? '—' : filtered.length}</span>
          <span className="text-xs text-[#667085] dark:text-[#7e93b0]">задач</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по названию или теме..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#CBCCC9] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20 dark:bg-[#161c2d] dark:border-[#1a2540] dark:text-[#f8fafc] dark:placeholder-[#4d6380]"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-[#666666] dark:text-[#7e93b0] mr-1">Тема:</span>
          {TOPIC_FILTERS.map(tf => (
            <button
              key={tf.value}
              onClick={() => setTopic(tf.value)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ${
                topic === tf.value
                  ? 'bg-[#6366F1] text-white shadow-sm'
                  : 'bg-[#F2F3F0] dark:bg-[#1a2236] text-[#666666] dark:text-[#4d6380] hover:bg-[#E7E8E5] dark:hover:bg-[#1e2d45] hover:text-[#111111] dark:hover:text-[#c8d8ec]'
              }`}
            >
              {tf.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                topic === tf.value ? 'bg-white/20 text-white' : 'bg-[#CBCCC9]/50 text-[#94a3b8]'
              }`}>
                {topicCounts[tf.value] ?? 0}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-[#666666] dark:text-[#7e93b0] mr-1">Сложность:</span>
          {DIFFICULTY_FILTERS.map(df => (
            <button
              key={df.value}
              onClick={() => setDifficulty(df.value)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ${
                difficulty === df.value
                  ? 'bg-[#111111] text-white shadow-sm dark:bg-white dark:text-[#111111]'
                  : 'bg-[#F2F3F0] dark:bg-[#1a2236] text-[#666666] dark:text-[#4d6380] hover:bg-[#E7E8E5] dark:hover:bg-[#1e2d45] hover:text-[#111111] dark:hover:text-[#c8d8ec]'
              }`}
            >
              {df.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                difficulty === df.value ? 'bg-white/20 text-white dark:bg-black/20 dark:text-[#111111]' : 'bg-[#CBCCC9]/50 text-[#94a3b8]'
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
            <div key={i} className="rounded-2xl border border-[#CBCCC9] bg-white p-4 animate-pulse dark:border-[#1a2540] dark:bg-[#161c2d]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E7E8E5] dark:bg-[#1e3158]" />
                <div className="flex-1">
                  <div className="h-4 w-48 bg-[#E7E8E5] rounded dark:bg-[#1e3158]" />
                  <div className="h-3 w-32 bg-[#E7E8E5] rounded mt-2 dark:bg-[#1e3158]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#CBCCC9] bg-white py-16 text-center dark:border-[#1a2540] dark:bg-[#161c2d]">
          <BookOpen className="mx-auto h-10 w-10 text-[#CBCCC9] dark:text-[#4d6380]" />
          <p className="mt-3 text-sm font-medium text-[#667085] dark:text-[#7e93b0]">Задачи не найдены</p>
          <p className="mt-1 text-xs text-[#94a3b8]">Попробуйте изменить фильтры</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((task, i) => {
            const borderColor = DIFF_BORDER[task.difficulty] ?? 'border-l-[#CBCCC9]'
            return (
              <button
                key={task.id}
                onClick={() => handleStartSolo(task)}
                className={`group flex items-center gap-4 rounded-2xl border border-[#CBCCC9] border-l-[3px] ${borderColor} bg-white px-4 py-3.5 text-left transition-all hover:shadow-md hover:border-[#6366F1]/40 dark:border-[#1a2540] dark:bg-[#161c2d] dark:hover:border-[#6366F1]/40 ${isMobile ? 'flex-col items-start gap-3' : ''}`}
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#F2F3F0] text-sm font-mono font-bold text-[#667085] dark:bg-[#1a2236] dark:text-[#7e93b0]">
                  {i + 1}
                </div>

                <div className={`flex-1 min-w-0 ${isMobile ? 'w-full' : ''}`}>
                  <p className="text-sm font-semibold text-[#111111] dark:text-[#f8fafc] group-hover:text-[#6366F1] transition-colors truncate">
                    {task.title}
                  </p>
                  {task.topics.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {task.topics.slice(0, 3).map(tp => (
                        <span key={tp} className="inline-flex items-center rounded-md bg-[#F2F3F0] px-2 py-0.5 text-[11px] font-medium text-[#475569] dark:bg-[#1a2236] dark:text-[#7e93b0]">
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
                    <span className="text-[11px] font-medium text-[#94a3b8] dark:text-[#4d6380] uppercase tracking-wide">
                      {task.language}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-[#CBCCC9] group-hover:text-[#6366F1] transition-colors dark:text-[#4d6380]" />
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
