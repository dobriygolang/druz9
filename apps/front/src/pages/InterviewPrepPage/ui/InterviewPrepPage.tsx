import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronRight, BookOpen, Code2, MessageSquare, Play, Database, Cpu, Server, Building2 } from 'lucide-react'
import { interviewPrepApi, type InterviewPrepTask, type MockBlueprint } from '@/features/InterviewPrep/api/interviewPrepApi'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { ErrorState } from '@/shared/ui/ErrorState'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import { useToast } from '@/shared/ui/Toast'
import { PREP_TYPE_LABELS } from '@/shared/lib/taskLabels'

const PREP_TYPE_ICONS: Record<string, React.ReactNode> = {
  coding:        <Code2 className="w-4 h-4 text-[#6366f1]" />,
  algorithm:     <Cpu className="w-4 h-4 text-[#8b5cf6]" />,
  sql:           <Database className="w-4 h-4 text-[#a16207]" />,
  system_design: <BookOpen className="w-4 h-4 text-[#6366F1]" />,
  behavioral:    <MessageSquare className="w-4 h-4 text-[#22c55e]" />,
}

const MOCK_STAGES = [
  { icon: <Cpu className="w-4 h-4" />,      label: 'Algorithms',       color: 'bg-[#e0f2fe] text-[#0369a1]' },
  { icon: <Code2 className="w-4 h-4" />,    label: 'Practical Coding', color: 'bg-[#ede9fe] text-[#6d28d9]' },
  { icon: <Database className="w-4 h-4" />, label: 'SQL / Debugging',  color: 'bg-[#fef9c3] text-[#a16207]' },
  { icon: <Server className="w-4 h-4" />,   label: 'Behavioral',       color: 'bg-[#dcfce7] text-[#15803d]' },
  { icon: <BookOpen className="w-4 h-4" />, label: 'System Design',    color: 'bg-[#fce7f3] text-[#be185d]' },
]

export function InterviewPrepPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { toast } = useToast()
  const [tasks, setTasks] = useState<InterviewPrepTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [blueprints, setBlueprints] = useState<MockBlueprint[]>([])
  const [selectedBlueprintSlug, setSelectedBlueprintSlug] = useState('')
  const [mockLoading, setMockLoading] = useState(false)
  const [mockError, setMockError] = useState('')

  const fetchTasks = useCallback(() => {
    setError(null)
    setLoading(true)
    interviewPrepApi.listTasks()
      .then(ts => setTasks(ts))
      .catch(() => setError('Не удалось загрузить данные'))
      .finally(() => setLoading(false))
    interviewPrepApi.listMockBlueprints()
      .then(items => {
        setBlueprints(items)
        setSelectedBlueprintSlug(prev => prev || items[0]?.slug || '')
      })
      .catch((err) => { console.error('InterviewPrepPage blueprints fetch error:', err) })
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const filtered = tasks.filter(t => {
    if (category && t.prepType !== category) return false
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const handleStartMock = async (programSlug?: string) => {
    setMockLoading(true)
    setMockError('')
    try {
      const session = await interviewPrepApi.startMockSession({ programSlug: programSlug || selectedBlueprintSlug }) as any
      localStorage.setItem('interview:last_mock_session', session?.id ?? '')
      navigate(`/growth/interview-prep/mock/${session?.id}`)
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? ''
      if (msg.includes('another mock session') || msg.includes('active')) {
        const lastId = localStorage.getItem('interview:last_mock_session')
        setMockError(lastId ? 'active_session:' + lastId : 'Завершите текущую сессию перед началом новой')
      } else {
        setMockError('Не удалось создать сессию')
        toast('Не удалось создать mock-сессию', 'error')
      }
    } finally {
      setMockLoading(false)
    }
  }

  if (error) return <ErrorState message={error} onRetry={() => { setError(null); fetchTasks() }} />

  return (
    <div className={isMobile ? 'px-4 pt-4 pb-24 flex flex-col gap-4' : 'px-4 md:px-6 pt-4 pb-6 flex flex-col gap-5'}>

      {/* ── Mock Interview hero ─────────────────────────────────────── */}
      <div className={`overflow-hidden border ${isMobile ? 'rounded-[30px] border-[#d8d9d6] shadow-[0_18px_34px_rgba(15,23,42,0.08)]' : 'rounded-2xl border-[#CBCCC9]'}`}>
        <div className="h-1.5 bg-gradient-to-r from-[#6366F1] via-[#8b5cf6] to-[#a78bfa]" />
        <div className={isMobile ? 'bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(238,242,255,0.9))] p-5' : 'p-5'}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Play className="w-4 h-4 text-[#6366F1]" />
                <h2 className="text-base font-bold text-[#111111]">Mock Interview</h2>
              </div>
              <p className="text-sm text-[#666666] mb-4">
                Выбери канонический mock-сценарий и пройди его как цельный loop с AI-оценкой по каждому раунду.
              </p>
              {/* Stages */}
              <div className={`mb-4 gap-2 ${isMobile ? 'flex overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden' : 'flex flex-wrap'}`}>
                {MOCK_STAGES.map((s, i) => (
                  <span key={i} className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${s.color} ${isMobile ? 'whitespace-nowrap' : ''}`}>
                    {s.icon} {s.label}
                  </span>
                ))}
              </div>
              {/* Active session warning */}
              {mockError && mockError.startsWith('active_session:') && (
                <div className="mb-3 flex items-center gap-3 px-3 py-2.5 bg-[#FFF7ED] border border-[#FED7AA] rounded-lg">
                  <p className="text-xs text-[#92400E] flex-1">Есть незавершённая сессия</p>
                  <button
                    onClick={() => navigate(`/growth/interview-prep/mock/${mockError.split(':')[1]}`)}
                    className="text-xs font-semibold text-[#EA580C] hover:underline flex-shrink-0"
                  >
                    Продолжить →
                  </button>
                </div>
              )}
              {mockError && !mockError.startsWith('active_session:') && (
                <p className="text-xs text-[#ef4444] mb-3">{mockError}</p>
              )}
            </div>
          </div>

          {/* Program selector + start */}
          <div className={`gap-3 ${isMobile ? 'flex flex-col items-stretch' : 'flex items-center flex-wrap'}`}>
            {blueprints.length > 0 && (
              <div className={`gap-2 ${isMobile ? 'flex overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden' : 'flex flex-wrap'}`}>
                {blueprints.map(bp => (
                  <button
                    key={bp.slug}
                    onClick={() => setSelectedBlueprintSlug(bp.slug)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      selectedBlueprintSlug === bp.slug ? 'bg-[#6366F1] text-white border-[#6366F1]' : 'bg-white border-[#CBCCC9] text-[#666666] hover:border-[#6366F1]/50'
                    } ${isMobile ? 'whitespace-nowrap' : ''}`}
                  >
                    <Building2 className="w-3 h-3" /> {bp.title}
                  </button>
                ))}
              </div>
            )}
            <Button
              variant="orange"
              size="sm"
              loading={mockLoading}
              onClick={() => handleStartMock()}
              className={isMobile ? 'w-full justify-center rounded-2xl' : 'flex-shrink-0'}
            >
              <Play className="w-3.5 h-3.5" />
              Начать Mock Interview
            </Button>
          </div>
        </div>
      </div>

      {/* ── Solo practice ───────────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-[#111111] mb-3">Задачи для практики</h3>

        {/* Filters */}
        <div className={`mb-3 gap-2 ${isMobile ? 'flex flex-col' : 'flex items-center flex-wrap'}`}>
          <div className={`relative ${isMobile ? 'w-full' : 'flex-1 min-w-[160px]'}`}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-[#CBCCC9] rounded-lg text-sm focus:outline-none focus:border-[#6366F1]/50"
            />
          </div>
          <div className={`gap-1.5 ${isMobile ? 'flex overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden' : 'flex flex-wrap'}`}>
            {(['', 'coding', 'algorithm', 'sql', 'system_design', 'behavioral'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  category === cat ? 'bg-[#6366F1] text-white' : 'bg-white border border-[#CBCCC9] text-[#666666] hover:border-[#94a3b8]'
                } ${isMobile ? 'whitespace-nowrap' : ''}`}
              >
                {cat === '' ? 'Все' : PREP_TYPE_LABELS[cat] ?? cat}
              </button>
            ))}
          </div>
        </div>

        {/* Task list */}
        <div className="bg-white rounded-2xl border border-[#CBCCC9] overflow-hidden">
          <div className="divide-y divide-[#F2F3F0]">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="px-5 py-4 flex items-center gap-4 animate-pulse">
                  <div className="w-8 h-8 rounded-lg bg-[#E7E8E5]" />
                  <div className="flex-1 h-4 bg-[#E7E8E5] rounded" />
                  <div className="w-20 h-4 bg-[#E7E8E5] rounded" />
                </div>
              ))
              : filtered.length === 0
                ? <div className="px-5 py-12 text-center text-sm text-[#94a3b8]">Ничего не найдено</div>
                : filtered.map(task => (
                  <div
                    key={task.id}
                    onClick={async () => {
                      try {
                        const session = await interviewPrepApi.startSession(task.id) as any
                        navigate(`/growth/interview-prep/${session?.id ?? task.id}`)
                      } catch {
                        toast('Не удалось начать сессию', 'error')
                      }
                    }}
                    className={`cursor-pointer px-5 py-3.5 transition-colors hover:bg-[#F2F3F0] ${isMobile ? 'flex flex-col items-start gap-3' : 'flex items-center gap-4'}`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#F2F3F0] flex items-center justify-center flex-shrink-0">
                      {PREP_TYPE_ICONS[task.prepType] ?? <BookOpen className="w-4 h-4 text-[#94a3b8]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#111111] truncate">{task.title}</p>
                      <p className="text-xs text-[#666666] mt-0.5">
                        {task.companyTag || 'General'} · {Math.round(task.durationSeconds / 60)} мин
                      </p>
                    </div>
                    <div className={`flex items-center gap-3 ${isMobile ? 'w-full justify-between' : ''}`}>
                      <Badge variant={
                        task.prepType === 'coding' ? 'indigo' :
                        task.prepType === 'algorithm' ? 'indigo' :
                        task.prepType === 'sql' ? 'orange' :
                        task.prepType === 'system_design' ? 'orange' : 'success'
                      }>
                        {PREP_TYPE_LABELS[task.prepType] ?? task.prepType}
                      </Badge>
                      <ChevronRight className="w-4 h-4 text-[#CBCCC9] flex-shrink-0" />
                    </div>
                  </div>
                ))
            }
          </div>
        </div>
      </div>

      {/* ── Stats row ────────────────────────────────────────────────── */}
      {tasks.length > 0 && (
        <div className={`grid gap-3 ${isMobile ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6'}`}>
          {[
            { label: 'Всего', value: tasks.length },
            { label: 'Coding', value: tasks.filter(t => t.prepType === 'coding').length },
            { label: 'Алгоритмы', value: tasks.filter(t => t.prepType === 'algorithm').length },
            { label: 'SQL', value: tasks.filter(t => t.prepType === 'sql').length },
            { label: 'System Design', value: tasks.filter(t => t.prepType === 'system_design').length },
            { label: 'Behavioral', value: tasks.filter(t => t.prepType === 'behavioral').length },
          ].map(s => (
            <div key={s.label} className={`flex items-center justify-between bg-white border px-4 py-3 ${isMobile ? 'rounded-2xl border-[#d8d9d6] shadow-[0_10px_24px_rgba(15,23,42,0.05)]' : 'rounded-xl border-[#CBCCC9]'}`}>
              <span className="text-xs text-[#666666]">{s.label}</span>
              <span className="text-base font-bold text-[#111111] font-mono">{s.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
