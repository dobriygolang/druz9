import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronRight } from 'lucide-react'
import { codeRoomApi } from '@/features/CodeRoom/api/codeRoomApi'
import type { Task } from '@/entities/CodeRoom/model/types'
import { Badge } from '@/shared/ui/Badge'
import { ErrorState } from '@/shared/ui/ErrorState'

const DIFF_LABELS: Record<string, string> = {
  TASK_DIFFICULTY_EASY: 'Easy', TASK_DIFFICULTY_MEDIUM: 'Medium', TASK_DIFFICULTY_HARD: 'Hard',
}
const DIFF_VARIANTS: Record<string, 'success' | 'warning' | 'danger'> = {
  TASK_DIFFICULTY_EASY: 'success', TASK_DIFFICULTY_MEDIUM: 'warning', TASK_DIFFICULTY_HARD: 'danger',
}

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

export function PracticeSoloPage() {
  const navigate = useNavigate()
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

  // Count tasks per topic for badges
  const topicCounts = useMemo(() => {
    const counts: Record<string, number> = { '': tasks.length }
    for (const tf of TOPIC_FILTERS) {
      if (!tf.value) continue
      counts[tf.value] = tasks.filter(t => t.topics.some(tp => tp.toLowerCase().includes(tf.value.toLowerCase()))).length
    }
    return counts
  }, [tasks])

  // Count tasks per difficulty for badges
  const difficultyCounts = useMemo(() => {
    const base = topic ? filtered : tasks
    const counts: Record<string, number> = { '': base.length }
    for (const df of DIFFICULTY_FILTERS) {
      if (!df.value) continue
      counts[df.value] = base.filter(t => t.difficulty === df.value).length
    }
    return counts
  }, [tasks, filtered, topic])

  const handleStartSolo = async (task: Task) => {
    try {
      const { room } = await codeRoomApi.createRoom({ mode: 'ROOM_MODE_ALL' })
      navigate(`/code-rooms/${room.id}`, {
        state: { title: task.title, statement: task.statement, starterCode: task.starterCode, language: task.language },
      })
    } catch {}
  }

  if (error) return <ErrorState message={error} onRetry={() => { setError(null); fetchTasks() }} />

  return (
    <div className="px-6 pt-4 pb-6">
      {/* Search */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск задач..."
            className="w-full pl-9 pr-4 py-2 bg-[#F2F3F0] border border-[#CBCCC9] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20"
          />
        </div>
      </div>

      {/* Topic filter pills */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-xs font-medium text-[#666666] mr-1">Тема:</span>
        {TOPIC_FILTERS.map(tf => (
          <button
            key={tf.value}
            onClick={() => setTopic(tf.value)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ${
              topic === tf.value
                ? 'bg-[#6366F1] text-white shadow-sm'
                : 'bg-[#F2F3F0] text-[#666666] hover:bg-[#E7E8E5] hover:text-[#111111]'
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

      {/* Difficulty filter pills */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs font-medium text-[#666666] mr-1">Сложность:</span>
        {DIFFICULTY_FILTERS.map(df => (
          <button
            key={df.value}
            onClick={() => setDifficulty(df.value)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ${
              difficulty === df.value
                ? 'bg-[#111111] text-white shadow-sm'
                : 'bg-[#F2F3F0] text-[#666666] hover:bg-[#E7E8E5] hover:text-[#111111]'
            }`}
          >
            {df.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              difficulty === df.value ? 'bg-white/20 text-white' : 'bg-[#CBCCC9]/50 text-[#94a3b8]'
            }`}>
              {difficultyCounts[df.value] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Task table */}
      <div className="bg-white rounded-2xl border border-[#CBCCC9] overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center px-6 py-3 border-b border-[#CBCCC9] text-xs font-semibold text-[#666666] uppercase tracking-wide">
          <span className="w-8">#</span>
          <span>Задача</span>
          <span className="w-20 text-center">Теги</span>
          <span className="w-20 text-center">Сложность</span>
          <span className="w-16" />
        </div>
        <div className="divide-y divide-[#F2F3F0]">
          {loading ? Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-6 py-3 flex items-center gap-4 animate-pulse">
              <div className="w-8 h-3 bg-[#E7E8E5] rounded" />
              <div className="flex-1 h-3 bg-[#E7E8E5] rounded" />
              <div className="w-16 h-3 bg-[#E7E8E5] rounded" />
              <div className="w-16 h-3 bg-[#E7E8E5] rounded" />
            </div>
          )) : filtered.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-[#94a3b8]">Задачи не найдены</div>
          ) : filtered.map((task, i) => (
            <div
              key={task.id}
              onClick={() => handleStartSolo(task)}
              className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center px-6 py-3 hover:bg-[#F2F3F0] cursor-pointer transition-colors"
            >
              <span className="w-8 text-sm text-[#94a3b8] font-mono">{i + 1}</span>
              <div>
                <p className="text-sm font-medium text-[#111111]">{task.title}</p>
                {task.topics.length > 0 && (
                  <p className="text-xs text-[#666666] mt-0.5">{task.topics.slice(0, 2).join(', ')}</p>
                )}
              </div>
              <div className="w-20 flex justify-center" />
              <div className="w-20 flex justify-center">
                {task.difficulty && task.difficulty !== 'TASK_DIFFICULTY_UNSPECIFIED' && (
                  <Badge variant={DIFF_VARIANTS[task.difficulty] ?? 'default'}>
                    {DIFF_LABELS[task.difficulty] ?? task.difficulty}
                  </Badge>
                )}
              </div>
              <div className="w-16 flex justify-end">
                <ChevronRight className="w-4 h-4 text-[#CBCCC9]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
