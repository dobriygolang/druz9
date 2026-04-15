import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Search, ChevronRight, BookOpen, Code2, MessageSquare, Play, Database,
  Cpu, Building2, Clock, Sparkles, ArrowRight, Zap, Target, Star,
} from 'lucide-react'
import { interviewPrepApi, type InterviewPrepTask, type MockBlueprint } from '@/features/InterviewPrep/api/interviewPrepApi'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { ErrorState } from '@/shared/ui/ErrorState'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import { useToast } from '@/shared/ui/Toast'
import { PREP_TYPE_LABELS } from '@/shared/lib/taskLabels'
import { PageMeta } from '@/shared/ui/PageMeta'

/* ── Constants ─────────────────────────────────────────────────────── */

const PREP_TYPE_ICONS: Record<string, React.ReactNode> = {
  coding:        <Code2 className="w-4 h-4" />,
  algorithm:     <Cpu className="w-4 h-4" />,
  sql:           <Database className="w-4 h-4" />,
  system_design: <BookOpen className="w-4 h-4" />,
  code_review:   <Code2 className="w-4 h-4" />,
  behavioral:    <MessageSquare className="w-4 h-4" />,
}

const PREP_TYPE_COLORS: Record<string, { bg: string; text: string; icon: string; border: string }> = {
  coding:        { bg: 'bg-[#EEF2FF]', text: 'text-[#4338ca]', icon: 'text-[#6366f1]', border: 'border-l-[#6366f1]' },
  algorithm:     { bg: 'bg-[#f5f3ff]', text: 'text-[#6d28d9]', icon: 'text-[#8b5cf6]', border: 'border-l-[#8b5cf6]' },
  sql:           { bg: 'bg-[#fffbeb]', text: 'text-[#a16207]', icon: 'text-[#d97706]', border: 'border-l-[#d97706]' },
  system_design: { bg: 'bg-[#fdf2f8]', text: 'text-[#be185d]', icon: 'text-[#ec4899]', border: 'border-l-[#ec4899]' },
  code_review:   { bg: 'bg-[#f0fdf4]', text: 'text-[#15803d]', icon: 'text-[#22c55e]', border: 'border-l-[#22c55e]' },
  behavioral:    { bg: 'bg-[#f0fdf4]', text: 'text-[#15803d]', icon: 'text-[#22c55e]', border: 'border-l-[#22c55e]' },
}

const MOCK_STAGES = [
  { icon: <Cpu className="w-3.5 h-3.5" />,      label: 'Algorithms',       num: 1 },
  { icon: <Code2 className="w-3.5 h-3.5" />,    label: 'Practical Coding', num: 2 },
  { icon: <Database className="w-3.5 h-3.5" />, label: 'SQL / Debugging',  num: 3 },
  { icon: <MessageSquare className="w-3.5 h-3.5" />, label: 'Behavioral',  num: 4 },
  { icon: <BookOpen className="w-3.5 h-3.5" />, label: 'System Design',    num: 5 },
]

const CATEGORIES = ['', 'coding', 'algorithm', 'sql', 'system_design', 'behavioral'] as const

const ROUND_META: Record<string, { icon: React.ReactNode; color: string }> = {
  coding_algorithmic: { icon: <Cpu className="w-3.5 h-3.5" />, color: 'border-[#38bdf8]/20 bg-[#0c4a6e]/30 text-[#bae6fd]' },
  coding_practical:   { icon: <Code2 className="w-3.5 h-3.5" />, color: 'border-[#8b5cf6]/20 bg-[#312e81]/30 text-[#ddd6fe]' },
  sql:                { icon: <Database className="w-3.5 h-3.5" />, color: 'border-[#f59e0b]/20 bg-[#78350f]/30 text-[#fde68a]' },
  behavioral:         { icon: <MessageSquare className="w-3.5 h-3.5" />, color: 'border-[#22c55e]/20 bg-[#14532d]/30 text-[#bbf7d0]' },
  system_design:      { icon: <BookOpen className="w-3.5 h-3.5" />, color: 'border-[#ec4899]/20 bg-[#831843]/30 text-[#fbcfe8]' },
  code_review:        { icon: <Search className="w-3.5 h-3.5" />, color: 'border-white/15 bg-white/5 text-white/80' },
}

function formatRoundMinutes(durationSeconds: number): string {
  const minutes = Math.max(1, Math.round((durationSeconds || 0) / 60))
  return `${minutes}m`
}

/* ── Component ─────────────────────────────────────────────────────── */

export function InterviewPrepPage() {
  const { t } = useTranslation()
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
      .catch(() => setError(t('common.loadFailed')))
      .finally(() => setLoading(false))
    interviewPrepApi.listMockBlueprints()
      .then(items => {
        setBlueprints(items)
        setSelectedBlueprintSlug(prev => prev || items[0]?.slug || '')
      })
      .catch((err) => { console.error('InterviewPrepPage blueprints fetch error:', err) })
  }, [t])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const filtered = useMemo(() => tasks.filter(t => {
    if (category && t.prepType !== category) return false
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [tasks, category, search])

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { '': tasks.length }
    for (const t of tasks) counts[t.prepType] = (counts[t.prepType] ?? 0) + 1
    return counts
  }, [tasks])

  const selectedBlueprint = useMemo(
    () => blueprints.find(bp => bp.slug === selectedBlueprintSlug) ?? blueprints[0] ?? null,
    [blueprints, selectedBlueprintSlug],
  )

  const handleStartMock = async (programSlug?: string) => {
    setMockLoading(true)
    setMockError('')
    try {
      const blueprint = blueprints.find(bp => bp.slug === (programSlug || selectedBlueprintSlug)) ?? selectedBlueprint
      const session = await interviewPrepApi.startMockSession({
        programSlug: programSlug || selectedBlueprintSlug,
        companyTag: blueprint?.primaryAliasSlug || blueprint?.publicAliasSlugs?.[0] || '',
      }) as any
      localStorage.setItem('interview:last_mock_session', session?.id ?? '')
      navigate(`/growth/interview-prep/mock/${session?.id}`)
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? ''
      if (msg.includes('another mock session') || msg.includes('active')) {
        const lastId = localStorage.getItem('interview:last_mock_session')
        setMockError(lastId ? 'active_session:' + lastId : t('interviewPrep.mock.finishCurrent'))
      } else {
        setMockError(t('interviewPrep.mock.createFailed'))
        toast(t('interviewPrep.mock.createFailed'), 'error')
      }
    } finally {
      setMockLoading(false)
    }
  }

  const handleStartSolo = async (task: InterviewPrepTask) => {
    try {
      const session = await interviewPrepApi.startSession(task.id) as any
      navigate(`/growth/interview-prep/${session?.id ?? task.id}`)
    } catch {
      toast(t('interviewPrep.solo.startFailed'), 'error')
    }
  }

  if (error) return <ErrorState message={error} onRetry={() => { setError(null); fetchTasks() }} />

  return (
    <div className={isMobile ? 'px-4 pt-4 pb-24 flex flex-col gap-5' : 'px-4 md:px-6 pt-4 pb-6 flex flex-col gap-6'}>
      <PageMeta title={t('interviewPrep.meta.title')} description={t('interviewPrep.meta.description')} canonicalPath="/growth/interview-prep" />

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="section-enter relative overflow-hidden rounded-[32px] border border-[#d8d9d6] bg-[linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(238,242,255,0.94)_40%,_rgba(245,243,255,0.96))] p-6 shadow-[0_24px_60px_rgba(99,102,241,0.10)] dark:border-[#1e3158] dark:bg-[linear-gradient(145deg,_rgba(11,13,22,0.96),_rgba(29,36,63,0.92)_50%,_rgba(46,26,58,0.88))] dark:shadow-[0_28px_70px_rgba(2,6,23,0.45)] md:p-8">
        <div className="pointer-events-none absolute inset-y-0 right-[-10%] w-[50%] rounded-full bg-[radial-gradient(circle,_rgba(99,102,241,0.18),_transparent_66%)] blur-2xl dark:bg-[radial-gradient(circle,_rgba(129,140,248,0.14),_transparent_70%)]" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#6366F1]/20 bg-[#6366F1]/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6366F1] dark:border-[#818cf8]/20 dark:bg-[#818cf8]/10 dark:text-[#a5b4fc]">
            <Target className="h-3 w-3" />
            {t('interviewPrep.hero.eyebrow')}
          </div>

          <h1 className="mt-4 max-w-[28ch] text-[28px] font-bold leading-[1.1] text-[#111111] dark:text-[#f8fafc] sm:text-[36px]">
            {t('interviewPrep.hero.title')}
          </h1>
          <p className="mt-3 max-w-[42rem] text-sm leading-6 text-[#475569] dark:text-[#94a3b8]">
            {t('interviewPrep.hero.subtitle')}
          </p>

          <div className="mt-5 flex items-center gap-4 text-sm text-[#667085] dark:text-[#7e93b0]">
            <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-[#f59e0b]" /> {t('interviewPrep.hero.aiReview')}</span>
            <span className="h-3.5 w-px bg-[#CBCCC9] dark:bg-[#1e3158]" />
            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-[#6366F1]" /> {t('interviewPrep.hero.timer')}</span>
            <span className="h-3.5 w-px bg-[#CBCCC9] dark:bg-[#1e3158]" />
            <span className="flex items-center gap-1.5"><Star className="h-3.5 w-3.5 text-[#ec4899]" /> {t('interviewPrep.hero.score')}</span>
          </div>
        </div>
      </section>

      {/* ── Mock Interview ─────────────────────────────────────────── */}
      <section className="section-enter">
        <div className="relative overflow-hidden rounded-[24px] border border-[#1e1b4b] bg-[linear-gradient(145deg,_#0f0a2e,_#1e1b4b_50%,_#312e81)] p-6 text-white shadow-[0_20px_50px_rgba(99,102,241,0.2)] md:p-8">
          <div className="pointer-events-none absolute right-[-5%] top-[-20%] h-[200%] w-[40%] rounded-full bg-[radial-gradient(circle,_rgba(139,92,246,0.25),_transparent_65%)] blur-2xl" />

          <div className="relative">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
                    <Sparkles className="h-4.5 w-4.5 text-[#c4b5fd]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">{selectedBlueprint?.primaryAliasName || selectedBlueprint?.title || t('interviewPrep.mock.titleFallback')}</h2>
                    <p className="text-[13px] text-white/60">{selectedBlueprint?.title || t('interviewPrep.mock.loopFallback')}</p>
                  </div>
                </div>

                <p className="mt-4 max-w-[40rem] text-sm leading-6 text-white/75">
                  {selectedBlueprint?.description || t('interviewPrep.mock.descriptionFallback')}
                </p>

                {/* Stage pipeline */}
                <div className={`mt-5 ${isMobile ? 'flex overflow-x-auto gap-2 pb-1 no-scrollbar' : 'flex flex-wrap gap-2'}`}>
                  {(selectedBlueprint?.rounds?.length ? selectedBlueprint.rounds : MOCK_STAGES).map((s: any, index: number) => {
                    const meta = 'roundType' in s ? ROUND_META[s.roundType] : null
                    const icon = meta?.icon ?? s.icon
                    const color = meta?.color ?? 'border-white/10 bg-white/5 text-white/80'
                    const label = 'roundType' in s ? s.title : s.label
                    const duration = 'durationSeconds' in s ? formatRoundMinutes(s.durationSeconds) : null
                    return (
                    <div
                      key={'roundType' in s ? `${s.roundType}-${s.position}` : s.num}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 backdrop-blur ${color} ${isMobile ? 'flex-shrink-0' : ''}`}
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white/10 text-[10px] font-bold">
                        {'roundType' in s ? index + 1 : s.num}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs font-medium">
                        {icon}
                        {label}
                      </span>
                      {duration && (
                        <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/75">
                          {duration}
                        </span>
                      )}
                    </div>
                  )})}
                </div>
                {selectedBlueprint?.introText && (
                  <p className="mt-4 max-w-[40rem] text-xs leading-5 text-white/60">
                    {selectedBlueprint.introText}
                  </p>
                )}
              </div>

              {!isMobile && (
                <div className="flex flex-col items-end gap-1 text-right">
                  <p className="text-3xl font-bold font-mono text-white/90">{selectedBlueprint?.rounds?.length || 5}</p>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">{t('interviewPrep.mock.rounds')}</p>
                </div>
              )}
            </div>

            {/* Active session warning */}
            {mockError && mockError.startsWith('active_session:') && (
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#fbbf24]/30 bg-[#fbbf24]/10 px-4 py-3">
                <p className="flex-1 text-sm text-[#fde68a]">{t('interviewPrep.mock.unfinished')}</p>
                <button
                  onClick={() => navigate(`/growth/interview-prep/mock/${mockError.split(':')[1]}`)}
                  className="flex items-center gap-1 text-sm font-semibold text-[#fbbf24] hover:text-[#fde68a] transition-colors"
                >
                  {t('interviewPrep.mock.continue')} <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            {mockError && !mockError.startsWith('active_session:') && (
              <p className="mt-3 text-sm text-[#fca5a5]">{mockError}</p>
            )}

            {/* Blueprint selector + CTA */}
            <div className={`mt-5 ${isMobile ? 'flex flex-col gap-3' : 'flex items-center gap-3'}`}>
              {blueprints.length > 0 && (
                <div className={`flex gap-2 ${isMobile ? 'overflow-x-auto pb-1 no-scrollbar' : 'flex-wrap'}`}>
                  {blueprints.map(bp => (
                    <button
                      key={bp.slug}
                      onClick={() => setSelectedBlueprintSlug(bp.slug)}
                      className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-all ${isMobile ? 'flex-shrink-0' : ''} ${
                        selectedBlueprintSlug === bp.slug
                          ? 'border-white/30 bg-white/15 text-white shadow-[0_0_20px_rgba(255,255,255,0.06)]'
                          : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80'
                      }`}
                    >
                      <Building2 className="w-3 h-3" />
                      {bp.primaryAliasName || bp.title}
                    </button>
                  ))}
                </div>
              )}
              <Button
                variant="orange"
                size="md"
                loading={mockLoading}
                onClick={() => handleStartMock()}
                className={`flex-shrink-0 rounded-xl ${isMobile ? 'w-full justify-center' : ''}`}
              >
                <Play className="w-4 h-4" />
                {t('interviewPrep.mock.start')}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Solo Practice ──────────────────────────────────────────── */}
      <section className="section-enter">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#111111] dark:text-[#f8fafc]">{t('interviewPrep.solo.title')}</h2>
            <p className="mt-1 text-sm text-[#667085] dark:text-[#7e93b0]">{t('interviewPrep.solo.subtitle')}</p>
          </div>
          {!loading && (
            <span className="text-sm text-[#667085] dark:text-[#7e93b0]">
              <span className="font-semibold text-[#111111] dark:text-[#f8fafc]">{filtered.length}</span> {t('interviewPrep.solo.tasks')}
            </span>
          )}
        </div>

        {/* Search + filters */}
        <div className="flex flex-col gap-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('interviewPrep.solo.searchPlaceholder')}
              className="w-full rounded-xl border border-[#CBCCC9] bg-white py-2.5 pl-10 pr-4 text-sm text-[#111111] placeholder-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20 dark:border-[#1a2540] dark:bg-[#161c2d] dark:text-[#f8fafc] dark:placeholder-[#4d6380]"
            />
          </div>

          <div className={`flex gap-2 ${isMobile ? 'overflow-x-auto pb-1 no-scrollbar' : 'flex-wrap'}`}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${isMobile ? 'flex-shrink-0' : ''} ${
                  category === cat
                    ? 'bg-[#111111] text-white shadow-sm dark:bg-white dark:text-[#111111]'
                    : 'bg-white border border-[#CBCCC9] text-[#666666] hover:border-[#6366F1]/40 hover:text-[#111111] dark:bg-[#161c2d] dark:border-[#1a2540] dark:text-[#7e93b0] dark:hover:text-[#c8d8ec]'
                }`}
              >
                {cat === '' ? t('interviewPrep.solo.all') : PREP_TYPE_LABELS[cat] ?? cat}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  category === cat ? 'bg-white/20 text-white dark:bg-black/20 dark:text-[#111111]' : 'bg-[#F2F3F0] text-[#94a3b8] dark:bg-[#1a2236]'
                }`}>
                  {categoryCounts[cat] ?? 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Task grid */}
        {loading ? (
          <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-[#CBCCC9] bg-white p-4 dark:border-[#1a2540] dark:bg-[#161c2d]">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-[#E7E8E5] dark:bg-[#1e3158]" />
                  <div className="flex-1">
                    <div className="h-4 w-48 rounded bg-[#E7E8E5] dark:bg-[#1e3158]" />
                    <div className="mt-2 h-3 w-32 rounded bg-[#E7E8E5] dark:bg-[#1e3158]" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#CBCCC9] bg-white py-16 text-center dark:border-[#1a2540] dark:bg-[#161c2d]">
            <Search className="mx-auto h-10 w-10 text-[#CBCCC9] dark:text-[#4d6380]" />
            <p className="mt-3 text-sm font-medium text-[#667085] dark:text-[#7e93b0]">{t('interviewPrep.solo.emptyTitle')}</p>
            <p className="mt-1 text-xs text-[#94a3b8]">{t('interviewPrep.solo.emptyBody')}</p>
          </div>
        ) : (
          <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
            {filtered.map(task => {
              const colors = PREP_TYPE_COLORS[task.prepType] ?? PREP_TYPE_COLORS.coding
              return (
                <button
                  key={task.id}
                  onClick={() => handleStartSolo(task)}
                  className={`group flex items-start gap-4 rounded-2xl border border-[#CBCCC9] border-l-[3px] ${colors.border} bg-white p-4 text-left transition-all hover:shadow-md hover:border-[#6366F1]/30 dark:border-[#1a2540] dark:bg-[#161c2d] dark:hover:border-[#6366F1]/30`}
                >
                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${colors.bg} ${colors.icon} dark:bg-opacity-20`}>
                    {PREP_TYPE_ICONS[task.prepType] ?? <BookOpen className="w-4 h-4" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#111111] dark:text-[#f8fafc] group-hover:text-[#6366F1] transition-colors line-clamp-1">
                      {task.title}
                    </p>

                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <Badge variant={
                        task.prepType === 'coding' || task.prepType === 'algorithm' ? 'indigo'
                          : task.prepType === 'sql' ? 'warning'
                          : task.prepType === 'system_design' ? 'danger'
                          : 'success'
                      }>
                        {PREP_TYPE_LABELS[task.prepType] ?? task.prepType}
                      </Badge>

                      {task.companyTag && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#667085] dark:text-[#7e93b0]">
                          <Building2 className="h-3 w-3" />
                          {task.companyTag}
                        </span>
                      )}

                      <span className="inline-flex items-center gap-1 text-[11px] text-[#667085] dark:text-[#7e93b0]">
                        <Clock className="h-3 w-3" />
                        {t('interviewPrep.solo.minutes', { count: Math.round(task.durationSeconds / 60) })}
                      </span>

                      {task.language && (
                        <span className="text-[11px] font-medium uppercase tracking-wide text-[#94a3b8] dark:text-[#4d6380]">
                          {task.language}
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#CBCCC9] group-hover:text-[#6366F1] transition-colors dark:text-[#4d6380]" />
                </button>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
