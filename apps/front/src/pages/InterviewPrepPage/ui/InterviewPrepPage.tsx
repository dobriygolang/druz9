import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronRight, BookOpen, Code2, MessageSquare, Building2, ArrowRight } from 'lucide-react'
import { interviewPrepApi, type InterviewPrepTask } from '@/features/InterviewPrep/api/interviewPrepApi'
import { Badge } from '@/shared/ui/Badge'
import { Card } from '@/shared/ui/Card'
import { Button } from '@/shared/ui/Button'
import { ErrorState } from '@/shared/ui/ErrorState'
import { useToast } from '@/shared/ui/Toast'

const PREP_TYPE_ICONS: Record<string, React.ReactNode> = {
  coding: <Code2 className="w-4 h-4 text-[#6366f1]" />,
  system_design: <BookOpen className="w-4 h-4 text-[#6366F1]" />,
  behavioral: <MessageSquare className="w-4 h-4 text-[#22c55e]" />,
}

const PREP_TYPE_LABELS: Record<string, string> = {
  coding: 'Coding', system_design: 'System Design', behavioral: 'Behavioral',
}

export function InterviewPrepPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [tasks, setTasks] = useState<InterviewPrepTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [companies, setCompanies] = useState<string[]>([])
  const [selectedCompany, setSelectedCompany] = useState('')
  const [mockLoading, setMockLoading] = useState(false)
  const [mockError, setMockError] = useState('')

  const fetchTasks = useCallback(() => {
    setError(null)
    setLoading(true)
    interviewPrepApi.listTasks()
      .then(ts => setTasks(ts))
      .catch(() => setError('Не удалось загрузить данные'))
      .finally(() => setLoading(false))
    interviewPrepApi.listCompanies()
      .then(cs => setCompanies(cs))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const filtered = tasks.filter(t => {
    if (category && t.prepType !== category) return false
    if (selectedCompany && t.companyTag !== selectedCompany) return false
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const stats = [
    { label: 'Задач', value: tasks.length, icon: <BookOpen className="w-4 h-4 text-[#6366f1]" /> },
    { label: 'Coding', value: tasks.filter(t => t.prepType === 'coding').length, icon: <Code2 className="w-4 h-4 text-[#6366F1]" /> },
    { label: 'System Design', value: tasks.filter(t => t.prepType === 'system_design').length, icon: <BookOpen className="w-4 h-4 text-[#22c55e]" /> },
    { label: 'Behavioral', value: tasks.filter(t => t.prepType === 'behavioral').length, icon: <MessageSquare className="w-4 h-4 text-[#f59e0b]" /> },
  ]

  const handleStartMock = async (companyTag?: string) => {
    setMockLoading(true)
    setMockError('')
    try {
      const session = await interviewPrepApi.startMockSession(companyTag || selectedCompany || '') as any
      toast('Mock-сессия создана', 'success')
      navigate(`/growth/interview-prep/mock/${session?.id}`)
    } catch {
      setMockError('Не удалось создать mock-сессию')
      toast('Не удалось создать mock-сессию', 'error')
    } finally {
      setMockLoading(false)
    }
  }

  if (error) return <ErrorState message={error} onRetry={() => { setError(null); fetchTasks() }} />

  return (
    <div className="px-4 md:px-6 pt-4 pb-4 md:pb-6">
      {/* Company cards */}
      {companies.length > 0 && (
        <div className="mb-4">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {companies.map(company => {
              const count = tasks.filter(t => t.companyTag === company).length
              return (
                <div
                  key={company}
                  onClick={() => setSelectedCompany(prev => prev === company ? '' : company)}
                  className={`flex-shrink-0 w-[200px] rounded-2xl p-4 cursor-pointer transition-all border ${
                    selectedCompany === company
                      ? 'bg-[#EEF2FF] border-[#6366F1]'
                      : 'bg-white border-[#CBCCC9] hover:border-[#6366F1]/40 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-4 h-4 text-[#6366F1]" />
                    <span className="text-sm font-semibold text-[#111111] truncate">{company}</span>
                  </div>
                  <p className="text-xs text-[#666666] mb-3">{count} задач</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleStartMock(company) }}
                    disabled={mockLoading}
                    className="flex items-center gap-1 text-xs font-medium text-[#6366F1] hover:text-[#4F46E5] transition-colors disabled:opacity-50"
                  >
                    Начать Mock <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
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
        <div className="flex items-center gap-2 flex-wrap">
          {/* Company filter */}
          {companies.length > 0 && (
            <>
              <button
                onClick={() => setSelectedCompany('')}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  selectedCompany === '' ? 'bg-[#6366F1] text-white' : 'bg-white border border-[#CBCCC9] text-[#666666] hover:border-[#94a3b8]'
                }`}
              >
                Все компании
              </button>
              {companies.map(c => (
                <button
                  key={c}
                  onClick={() => setSelectedCompany(prev => prev === c ? '' : c)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                    selectedCompany === c ? 'bg-[#6366F1] text-white' : 'bg-white border border-[#CBCCC9] text-[#666666] hover:border-[#94a3b8]'
                  }`}
                >
                  {c}
                </button>
              ))}
              <div className="w-px h-5 bg-[#CBCCC9]" />
            </>
          )}
          {/* Category filter */}
          {['', 'coding', 'system_design', 'behavioral'].map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                category === cat ? 'bg-[#6366F1] text-[#0f172a]' : 'bg-white border border-[#CBCCC9] text-[#666666] hover:border-[#94a3b8]'
              }`}
            >
              {cat === '' ? 'Все' : PREP_TYPE_LABELS[cat] ?? cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
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
                  {task.companyTag && (
                    <Badge variant="default">
                      {task.companyTag}
                    </Badge>
                  )}
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
        <div className="w-full lg:w-[300px] lg:flex-shrink-0 flex flex-col gap-3">
          <Card padding="md">
            <h3 className="text-sm font-semibold text-[#111111] mb-2">Mock Interview</h3>
            <p className="text-xs text-[#666666] mb-3">Симулируй полное собеседование с AI</p>
            {mockError && (
              <p className="text-xs text-[#ef4444] mb-2">{mockError}</p>
            )}
            <Button
              variant="orange"
              size="sm"
              className="w-full justify-center"
              loading={mockLoading}
              onClick={() => handleStartMock()}
            >
              Начать Mock
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
