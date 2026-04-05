import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronRight, BookOpen, Code2, MessageSquare } from 'lucide-react'
import { interviewPrepApi, type InterviewPrepTask } from '@/features/InterviewPrep/api/interviewPrepApi'
import { Badge } from '@/shared/ui/Badge'
import { Card } from '@/shared/ui/Card'
import { Button } from '@/shared/ui/Button'

const PREP_TYPE_ICONS: Record<string, React.ReactNode> = {
  coding: <Code2 className="w-4 h-4 text-[#6366f1]" />,
  system_design: <BookOpen className="w-4 h-4 text-[#FF8400]" />,
  behavioral: <MessageSquare className="w-4 h-4 text-[#22c55e]" />,
}

const PREP_TYPE_LABELS: Record<string, string> = {
  coding: 'Coding', system_design: 'System Design', behavioral: 'Behavioral',
}

export function InterviewPrepPage() {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState<InterviewPrepTask[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')

  useEffect(() => {
    interviewPrepApi.listTasks()
      .then(ts => setTasks(ts))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = tasks.filter(t => {
    if (category && t.prepType !== category) return false
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const stats = [
    { label: 'Задач', value: tasks.length, icon: <BookOpen className="w-4 h-4 text-[#6366f1]" /> },
    { label: 'Coding', value: tasks.filter(t => t.prepType === 'coding').length, icon: <Code2 className="w-4 h-4 text-[#FF8400]" /> },
    { label: 'System Design', value: tasks.filter(t => t.prepType === 'system_design').length, icon: <BookOpen className="w-4 h-4 text-[#22c55e]" /> },
    { label: 'Behavioral', value: tasks.filter(t => t.prepType === 'behavioral').length, icon: <MessageSquare className="w-4 h-4 text-[#f59e0b]" /> },
  ]

  return (
    <div className="px-6 pt-4 pb-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {stats.map(s => (
          <Card key={s.label} padding="md" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#F2F3F0] flex items-center justify-center">{s.icon}</div>
            <div>
              <p className="text-lg font-bold text-[#111111] leading-none">{s.value}</p>
              <p className="text-xs text-[#666666] mt-0.5">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск задач..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-[#CBCCC9] rounded-lg text-sm focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          {['', 'coding', 'system_design', 'behavioral'].map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                category === cat ? 'bg-[#FF8400] text-[#0f172a]' : 'bg-white border border-[#CBCCC9] text-[#666666] hover:border-[#94a3b8]'
              }`}
            >
              {cat === '' ? 'Все' : PREP_TYPE_LABELS[cat] ?? cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-4">
        {/* Task list */}
        <div className="flex-1">
          <div className="bg-white rounded-2xl border border-[#CBCCC9] overflow-hidden">
            <div className="divide-y divide-[#F2F3F0]">
              {loading ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="px-5 py-4 flex items-center gap-4 animate-pulse">
                  <div className="w-8 h-8 rounded-lg bg-[#E7E8E5]" />
                  <div className="flex-1 h-4 bg-[#E7E8E5] rounded" />
                  <div className="w-20 h-4 bg-[#E7E8E5] rounded" />
                </div>
              )) : filtered.length === 0 ? (
                <div className="px-5 py-12 text-center text-sm text-[#94a3b8]">Ничего не найдено</div>
              ) : filtered.map((task) => (
                <div
                  key={task.id}
                  onClick={async () => {
                    try {
                      const session = await interviewPrepApi.startSession(task.id) as any
                      navigate(`/growth/interview-prep/${session?.id ?? task.id}`)
                    } catch {}
                  }}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#F2F3F0] cursor-pointer transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#F2F3F0] flex items-center justify-center flex-shrink-0">
                    {PREP_TYPE_ICONS[task.prepType] ?? <BookOpen className="w-4 h-4 text-[#94a3b8]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#111111] truncate">{task.title}</p>
                    <p className="text-xs text-[#666666] mt-0.5">{task.companyTag || 'General'} · {Math.round(task.durationSeconds / 60)} мин</p>
                  </div>
                  <Badge variant={task.prepType === 'coding' ? 'indigo' : task.prepType === 'system_design' ? 'orange' : 'success'}>
                    {PREP_TYPE_LABELS[task.prepType] ?? task.prepType}
                  </Badge>
                  <ChevronRight className="w-4 h-4 text-[#CBCCC9]" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="w-[300px] flex-shrink-0 flex flex-col gap-3">
          <Card padding="md" dark orangeBorder>
            <h3 className="text-sm font-semibold text-[#CBCCC9] mb-2">Mock Interview</h3>
            <p className="text-xs text-[#94a3b8] mb-3">Симулируй полное собеседование с AI</p>
            <Button variant="orange" size="sm" className="w-full justify-center">
              Начать Mock
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
