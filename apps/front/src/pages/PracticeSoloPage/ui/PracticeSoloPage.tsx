import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronRight } from 'lucide-react'
import { codeRoomApi } from '@/features/CodeRoom/api/codeRoomApi'
import type { Task } from '@/entities/CodeRoom/model/types'
import { Badge } from '@/shared/ui/Badge'
import { Select } from '@/shared/ui/Select'

const DIFF_LABELS: Record<string, string> = {
  TASK_DIFFICULTY_EASY: 'Easy', TASK_DIFFICULTY_MEDIUM: 'Medium', TASK_DIFFICULTY_HARD: 'Hard',
}
const DIFF_VARIANTS: Record<string, 'success' | 'warning' | 'danger'> = {
  TASK_DIFFICULTY_EASY: 'success', TASK_DIFFICULTY_MEDIUM: 'warning', TASK_DIFFICULTY_HARD: 'danger',
}

export function PracticeSoloPage() {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [difficulty, setDifficulty] = useState('')

  useEffect(() => {
    codeRoomApi.listTasks({ difficulty: difficulty || undefined })
      .then(ts => setTasks(ts))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [difficulty])

  const handleStartSolo = async (task: Task) => {
    try {
      const { room } = await codeRoomApi.createRoom({ mode: 'ROOM_MODE_ALL', task: task.statement })
      navigate(`/code-rooms/${room.id}`)
    } catch {}
  }

  const filtered = tasks.filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.topics.some(tp => tp.toLowerCase().includes(search.toLowerCase())))

  return (
    <div className="px-6 pt-4 pb-6">
      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск задач..."
            className="w-full pl-9 pr-4 py-2 bg-[#F2F3F0] border border-[#CBCCC9] rounded-lg text-sm focus:outline-none"
          />
        </div>
        <Select
          options={[{ value: '', label: 'Все' }, { value: 'TASK_DIFFICULTY_EASY', label: 'Easy' }, { value: 'TASK_DIFFICULTY_MEDIUM', label: 'Medium' }, { value: 'TASK_DIFFICULTY_HARD', label: 'Hard' }]}
          value={difficulty}
          onChange={setDifficulty}
          className="w-32"
        />
      </div>

      {/* Task table */}
      <div className="bg-white rounded-2xl border border-[#CBCCC9] overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center px-6 py-3 border-b border-[#CBCCC9] text-xs font-semibold text-[#64748b] uppercase tracking-wide">
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
                <p className="text-sm font-medium text-[#18181b]">{task.title}</p>
                {task.topics.length > 0 && (
                  <p className="text-xs text-[#64748b] mt-0.5">{task.topics.slice(0, 2).join(', ')}</p>
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
