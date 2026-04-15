import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Search, ChevronRight, BookOpen, Code2, MessageSquare, Play, Database,
  Cpu, Building2, Clock, Sparkles, ArrowRight, Flame,
} from 'lucide-react'
import { interviewPrepApi, type InterviewPrepTask, type MockBlueprint } from '@/features/InterviewPrep/api/interviewPrepApi'
import { codeRoomApi } from '@/features/CodeRoom/api/codeRoomApi'
import type { Task as CodeRoomTask } from '@/entities/CodeRoom/model/types'
import { journeyApi, type ReadinessResponse } from '@/features/Journey/api/journeyApi'
import { useAuth } from '@/app/providers/AuthProvider'
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

const CATEGORIES = ['', 'coding', 'algorithm', 'sql', 'system_design', 'code_review', 'behavioral'] as const

/* ── Component ─────────────────────────────────────────────────────── */

const LEVEL_VARIANTS: Record<string, 'default' | 'warning' | 'info' | 'success' | 'indigo'> = {
  novice: 'default',
  foundation: 'warning',
  practitioner: 'info',
  candidate: 'indigo',
  ready: 'success',
}

type SoloTask = {
  id: string
  sourceTaskId: string
  source: 'interview' | 'algorithm'
  title: string
  prepType: string
  language: string
  companyTag: string
  durationSeconds: number
  starterCode: string
  statement: string
  roomTask?: CodeRoomTask
}

function fromCodeRoomLanguageEnum(language: string): string {
  return language.replace('PROGRAMMING_LANGUAGE_', '').toLowerCase()
}

function getSoloPrepTypeLabel(t: (key: string) => string, prepType: string): string {
  if (prepType === 'algorithm') return t('interviewPrep.solo.generalAlgorithms')
  return PREP_TYPE_LABELS[prepType] ?? prepType
}

export function InterviewPrepPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { toast } = useToast()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const [tasks, setTasks] = useState<InterviewPrepTask[]>([])
  const [algorithmTasks, setAlgorithmTasks] = useState<CodeRoomTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState(() => searchParams.get('category') ?? '')
  const [blueprints, setBlueprints] = useState<MockBlueprint[]>([])
  const [selectedBlueprintSlug, setSelectedBlueprintSlug] = useState('')
  const [mockLoading, setMockLoading] = useState(false)
  const [mockAbortLoading, setMockAbortLoading] = useState(false)
  const [mockError, setMockError] = useState('')
  const [readiness, setReadiness] = useState<ReadinessResponse | null>(null)

  const fetchTasks = useCallback(() => {
    setError(null)
    setLoading(true)
    Promise.allSettled([
      interviewPrepApi.listTasks(),
      codeRoomApi.listTasks(),
    ])
      .then(([prepResult, codeRoomResult]) => {
        const prepFailed = prepResult.status === 'rejected'
        const codeRoomFailed = codeRoomResult.status === 'rejected'

        setTasks(prepResult.status === 'fulfilled' ? prepResult.value : [])
        setAlgorithmTasks(
          codeRoomResult.status === 'fulfilled'
            ? codeRoomResult.value
            : [],
        )

        if (prepFailed && codeRoomFailed) {
          setError(t('common.loadFailed'))
        }
      })
      .finally(() => setLoading(false))
    interviewPrepApi.listMockBlueprints()
      .then(items => {
        setBlueprints(items)
        setSelectedBlueprintSlug(prev => prev || items[0]?.slug || '')
      })
      .catch((err) => { console.error('InterviewPrepPage blueprints fetch error:', err) })
    if (user?.id) {
      journeyApi.getReadiness(user.id).then(setReadiness).catch(() => {/* readiness is optional */})
    }
  }, [t, user?.id])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  useEffect(() => {
    const nextCategory = searchParams.get('category') ?? ''
    setCategory(prev => (prev === nextCategory ? prev : nextCategory))
  }, [searchParams])

  const soloTasks = useMemo<SoloTask[]>(() => ([
    ...tasks.map((task) => ({
      id: `prep:${task.id}`,
      sourceTaskId: task.id,
      source: 'interview' as const,
      title: task.title,
      prepType: task.prepType,
      language: task.language,
      companyTag: task.companyTag,
      durationSeconds: task.durationSeconds,
      starterCode: task.starterCode,
      statement: task.statement,
    })),
    ...algorithmTasks.map((task) => ({
      id: `algorithm:${task.id}`,
      sourceTaskId: task.id,
      source: 'algorithm' as const,
      title: task.title,
      prepType: 'algorithm',
      language: fromCodeRoomLanguageEnum(task.language),
      companyTag: '',
      durationSeconds: 0,
      starterCode: task.starterCode,
      statement: task.statement,
      roomTask: task,
    })),
  ]), [tasks, algorithmTasks])

  const filtered = useMemo(() => soloTasks.filter((task) => {
    if (category && task.prepType !== category) return false
    if (search && !task.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [soloTasks, category, search])

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { '': soloTasks.length }
    for (const task of soloTasks) counts[task.prepType] = (counts[task.prepType] ?? 0) + 1
    return counts
  }, [soloTasks])

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
      navigate(`/prepare/interview-prep/mock/${session?.id}`)
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

  const handleAbortAndStartNew = async () => {
    const activeSessionId = mockError.startsWith('active_session:') ? mockError.split(':')[1] : null
    if (!activeSessionId) return
    setMockAbortLoading(true)
    try {
      await interviewPrepApi.abortMockSession(activeSessionId)
      setMockError('')
      await handleStartMock()
    } catch {
      toast(t('interviewPrep.mock.abortFailed'), 'error')
    } finally {
      setMockAbortLoading(false)
    }
  }

  const handleStartSolo = async (task: SoloTask) => {
    try {
      if (task.source === 'algorithm' && task.roomTask) {
        const { room } = await codeRoomApi.createRoom({ mode: 'ROOM_MODE_ALL', task: task.roomTask.title })
        navigate(`/code-rooms/${room.id}`, {
          state: {
            title: task.roomTask.title,
            statement: task.roomTask.statement,
            starterCode: task.roomTask.starterCode,
            language: fromCodeRoomLanguageEnum(task.roomTask.language),
            taskId: task.roomTask.id,
          },
        })
        return
      }

      const session = await interviewPrepApi.startSession(task.sourceTaskId) as any
      navigate(`/prepare/interview-prep/${session?.id ?? task.sourceTaskId}`)
    } catch {
      toast(t('interviewPrep.solo.startFailed'), 'error')
    }
  }

  if (error) return <ErrorState message={error} onRetry={() => { setError(null); fetchTasks() }} />

  return (
    <div className={isMobile ? 'px-4 pt-4 pb-24 flex flex-col gap-5' : 'px-4 md:px-6 pt-4 pb-6 flex flex-col gap-6'}>
      <PageMeta title={t('interviewPrep.meta.title')} description={t('interviewPrep.meta.description')} canonicalPath="/prepare/interview-prep" />

      {/* ── Header ─────────────────────────────────────────── */}
      <section className="section-enter flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#111111] dark:text-[#f8fafc] sm:text-2xl">
            {t('interviewPrep.hero.title')}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[#667085] dark:text-[#7e93b0]">
            {readiness && (
              <>
                <span className="font-mono font-bold text-[#6366F1]">{readiness.score}/100</span>
                <Badge variant={LEVEL_VARIANTS[readiness.level] ?? 'default'}>{readiness.levelLabel}</Badge>
              </>
            )}
            {readiness?.streakDays ? (
              <span className="inline-flex items-center gap-1">
                <Flame className="h-3.5 w-3.5 text-orange-500" />
                {readiness.streakDays} {t('journey.streak', 'days in a row')}
              </span>
            ) : null}
          </div>
        </div>
        {readiness?.nextAction && (
          <button
            onClick={() => navigate(readiness.nextAction!.actionUrl)}
            className="inline-flex items-center gap-2 rounded-full bg-[#111111] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] dark:bg-white dark:text-[#111111]"
          >
            {readiness.nextAction.title}
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </section>

      {/* ── Mock Interview ─────────────────────────────────────────── */}
      <section className="section-enter rounded-[24px] border border-[#1e1b4b] bg-[linear-gradient(145deg,_#0f0a2e,_#1e1b4b_50%,_#312e81)] p-5 text-white shadow-[0_12px_36px_rgba(99,102,241,0.15)] md:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
            <Sparkles className="h-4.5 w-4.5 text-[#c4b5fd]" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-white">{t('interviewPrep.mock.titleFallback')}</h2>
            <p className="text-xs text-white/60">{selectedBlueprint?.description || t('interviewPrep.mock.descriptionFallback')}</p>
          </div>
          {!isMobile && (
            <span className="text-xs text-white/40">
              {selectedBlueprint?.rounds?.length || 5} {t('interviewPrep.mock.rounds')}
            </span>
          )}
        </div>

        {/* Active session warning */}
        {mockError && mockError.startsWith('active_session:') && (
          <div className="mt-4 rounded-xl border border-[#fbbf24]/35 bg-[linear-gradient(135deg,_rgba(251,191,36,0.18),_rgba(120,53,15,0.24))] px-4 py-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#fde68a]">{t('interviewPrep.mock.unfinished')}</p>
                <p className="mt-1 text-xs text-white/65">
                  {t('interviewPrep.mock.abortHint', 'You can continue the current session or discard it and start from scratch.')}
                </p>
              </div>
              <button
                onClick={() => navigate(`/prepare/interview-prep/mock/${mockError.split(':')[1]}`)}
                className="inline-flex items-center justify-center gap-1 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/15"
              >
                {t('interviewPrep.mock.continue')} <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              onClick={handleAbortAndStartNew}
              disabled={mockAbortLoading}
              className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-[#fca5a5]/30 bg-[#7f1d1d]/55 px-3 py-2 text-sm font-semibold text-[#fee2e2] transition-colors hover:bg-[#991b1b]/70 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
            >
              {mockAbortLoading ? '...' : t('interviewPrep.mock.abortAndStartNew')}
            </button>
          </div>
        )}
        {mockError && !mockError.startsWith('active_session:') && (
          <p className="mt-3 text-sm text-[#fca5a5]">{mockError}</p>
        )}

        {/* Blueprint selector + CTA */}
        <div className={`mt-4 ${isMobile ? 'flex flex-col gap-3' : 'flex items-center gap-3'}`}>
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
                onClick={() => { setCategory(cat); setSearchParams(cat ? { category: cat } : {}, { replace: true }) }}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${isMobile ? 'flex-shrink-0' : ''} ${
                  category === cat
                    ? 'bg-[#111111] text-white shadow-sm dark:bg-white dark:text-[#111111]'
                    : 'bg-white border border-[#CBCCC9] text-[#666666] hover:border-[#6366F1]/40 hover:text-[#111111] dark:bg-[#161c2d] dark:border-[#1a2540] dark:text-[#7e93b0] dark:hover:text-[#c8d8ec]'
                }`}
              >
                {cat === '' ? t('interviewPrep.solo.all') : getSoloPrepTypeLabel(t, cat)}
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
                        {getSoloPrepTypeLabel(t, task.prepType)}
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
