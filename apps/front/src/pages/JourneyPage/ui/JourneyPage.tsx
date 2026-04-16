import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronRight,
  Flame,
  Calendar,
  Target,
  Swords,
  BookOpen,
  Code2,
  ArrowRight,
  TrendingUp,
  Award,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/app/providers/AuthProvider'
import { journeyApi, type ReadinessResponse } from '@/features/Journey/api/journeyApi'
import { Card } from '@/shared/ui/Card'
import { Badge } from '@/shared/ui/Badge'
import { CircularProgress } from '@/shared/ui/CircularProgress'
import { CompetencyBars, type CompetencyBarItem } from '@/shared/ui/CompetencyBars'
import { AnimatedNumber } from '@/shared/ui/AnimatedNumber'
import { ErrorState } from '@/shared/ui/ErrorState'
import { PageMeta } from '@/shared/ui/PageMeta'

const ACTION_ICONS: Record<string, React.ReactNode> = {
  mock: <BookOpen className="h-5 w-5 text-[#059669]" />,
  practice: <Code2 className="h-5 w-5 text-[#059669]" />,
  checkpoint: <Award className="h-5 w-5 text-[#059669]" />,
  arena: <Swords className="h-5 w-5 text-[#059669]" />,
}

const LEVEL_VARIANTS: Record<string, 'default' | 'warning' | 'info' | 'success' | 'indigo'> = {
  novice: 'default',
  foundation: 'warning',
  practitioner: 'info',
  candidate: 'indigo',
  ready: 'success',
}

function companyTone(percent: number): 'success' | 'warning' | 'danger' {
  if (percent >= 75) return 'success'
  if (percent >= 40) return 'warning'
  return 'danger'
}

export function JourneyPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [data, setData] = useState<ReadinessResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(() => {
    if (!user?.id) return
    setLoading(true)
    setError(null)
    journeyApi
      .getReadiness(user.id)
      .then(setData)
      .catch(() => setError(t('journey.error', 'Failed to load data')))
      .finally(() => setLoading(false))
  }, [user?.id, t])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (error) return <ErrorState message={error} onRetry={fetchData} />

  const firstName = user?.firstName || user?.username || ''

  return (
    <div className="flex min-h-full flex-col gap-4 px-4 pb-6 pt-4 md:gap-6 md:p-8">
      <PageMeta
        title={t('journey.meta.title', 'Journey')}
        description={t('journey.meta.description', 'Your path to the offer')}
        canonicalPath="/journey"
      />

      {/* Hero: Readiness Score */}
      <section className="section-enter relative rounded-[32px] border border-[#d8d9d6] bg-[linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(238,242,255,0.92)_48%,_rgba(255,247,237,0.95))] p-5 shadow-[0_24px_60px_rgba(5,150,105,0.12)] dark:border-[#1E4035] dark:bg-[linear-gradient(145deg,_rgba(11,13,22,0.96),_rgba(29,36,63,0.92)_52%,_rgba(46,26,38,0.88))] dark:shadow-[0_28px_70px_rgba(2,6,23,0.45)] md:p-7">
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[32px]">
          <div className="absolute inset-y-0 right-[-14%] w-[58%] rounded-full bg-[radial-gradient(circle,_rgba(5,150,105,0.24),_transparent_66%)] blur-2xl dark:bg-[radial-gradient(circle,_rgba(52,211,153,0.2),_transparent_70%)]" />
        </div>

        <div className="relative flex flex-col items-center gap-6 md:flex-row md:items-start md:gap-10">
          {/* Circular progress */}
          <div className="shrink-0">
            {loading ? (
              <div className="h-[180px] w-[180px] animate-pulse rounded-full bg-[#E4EBE5] dark:bg-[#1E4035]" />
            ) : (
              <CircularProgress value={data?.score ?? 0} size={180} strokeWidth={10}>
                <span className="font-mono text-[42px] font-bold leading-none text-[#111111] dark:text-[#E2F0E8]">
                  <AnimatedNumber value={data?.score ?? 0} />
                </span>
                <span className="mt-1 text-xs font-medium uppercase tracking-widest text-[#7A9982] dark:text-[#7BA88A]">
                  / 100
                </span>
              </CircularProgress>
            )}
          </div>

          {/* Text block */}
          <div className="flex flex-1 flex-col items-center gap-4 text-center md:items-start md:text-left">
            {loading ? (
              <div className="space-y-3">
                <div className="h-8 w-48 rounded bg-[#E4EBE5] dark:bg-[#1E4035]" />
                <div className="h-5 w-32 rounded bg-[#E4EBE5] dark:bg-[#1E4035]" />
              </div>
            ) : (
              <>
                <div>
                  <h1 className="font-mono text-[28px] font-semibold leading-tight text-[#111111] dark:text-[#E2F0E8] sm:text-[36px]">
                    {firstName ? `${firstName}, ` : ''}
                    {t('journey.title', 'your path to the offer')}
                  </h1>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant={LEVEL_VARIANTS[data?.level ?? 'novice'] ?? 'default'}>
                      {data?.levelLabel ?? t('journey.level.novice', 'Novice')}
                    </Badge>
                    {data?.streakDays ? (
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-[#7A9982] dark:text-[#7BA88A]">
                        <Flame className="h-4 w-4 text-emerald-500" />
                        {data.streakDays} {t('journey.streak', 'days in a row')}
                      </span>
                    ) : null}
                    {data?.activeDays ? (
                      <span className="inline-flex items-center gap-1 text-sm text-[#7A9982] dark:text-[#7BA88A]">
                        <Calendar className="h-3.5 w-3.5" />
                        {data.activeDays} {t('journey.activeDays', 'active days')}
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Strongest / Weakest chips */}
                <div className="flex flex-wrap gap-3">
                  {data?.strongestSkill && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e8f9ef] px-3 py-1 text-xs font-medium text-[#166534] dark:bg-[#0d2a1f] dark:text-[#4ade80]">
                      <TrendingUp className="h-3 w-3" />
                      {data.strongestSkill.label}: {data.strongestSkill.score}
                    </span>
                  )}
                  {data?.weakestSkill && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fef2f2] px-3 py-1 text-xs font-medium text-[#dc2626] dark:bg-[#2a0f0f] dark:text-[#f87171]">
                      <Target className="h-3 w-3" />
                      {data.weakestSkill.label}: {data.weakestSkill.score}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-4">
          {/* Next Action */}
          {!loading && data?.nextAction && (
            <Link to={data.nextAction.actionUrl} className="no-underline">
              <Card
                className="section-enter group border-[#059669]/30 hover:border-[#059669] dark:border-[#4338ca]/40 dark:hover:border-[#34D399]"
                padding="lg"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#ecfdf5] dark:bg-[#0d2a1f]">
                    {ACTION_ICONS[data.nextAction.actionType] ?? <Target className="h-5 w-5 text-[#059669]" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-widest text-[#059669] dark:text-[#34D399]">
                      {t('journey.nextStep', 'Next step')}
                    </p>
                    <p className="mt-1 text-base font-semibold text-[#111111] dark:text-[#E2F0E8]">
                      {data.nextAction.title}
                    </p>
                    <p className="mt-1 text-sm text-[#7A9982] dark:text-[#7BA88A]">
                      {data.nextAction.description}
                    </p>
                  </div>
                  <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-[#059669] transition-transform group-hover:translate-x-1" />
                </div>
              </Card>
            </Link>
          )}

          {/* Competency Breakdown */}
          <Card className="section-enter" padding="lg">
            <h2 className="mb-4 text-base font-semibold text-[#111111] dark:text-[#E2F0E8]">
              {t('journey.competencies', 'Skills')}
            </h2>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-3 w-24 rounded bg-[#E4EBE5] dark:bg-[#1E4035]" />
                    <div className="h-2 flex-1 rounded-full bg-[#E4EBE5] dark:bg-[#1E4035]" />
                    <div className="h-3 w-6 rounded bg-[#E4EBE5] dark:bg-[#1E4035]" />
                  </div>
                ))}
              </div>
            ) : (
              <CompetencyBars
                items={buildCompetencyItems(data)}
                focusKey={data?.weakestSkill?.key}
              />
            )}
          </Card>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Company Readiness */}
          {!loading && data?.companyReadiness && data.companyReadiness.length > 0 && (
            <Card className="section-enter" padding="lg">
              <h2 className="mb-4 text-base font-semibold text-[#111111] dark:text-[#E2F0E8]">
                {t('journey.companies', 'Company readiness')}
              </h2>
              <div className="flex flex-col gap-3">
                {data.companyReadiness.map((cr) => {
                  const tone = companyTone(cr.percent)
                  return (
                    <div key={cr.company} className="flex items-center gap-3">
                      <span className="w-20 shrink-0 truncate text-sm font-medium text-[#111111] dark:text-[#E2F0E8]">
                        {cr.company}
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-[#E4EBE5] dark:bg-[#1E4035] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            tone === 'success'
                              ? 'bg-[#22c55e]'
                              : tone === 'warning'
                                ? 'bg-[#f59e0b]'
                                : 'bg-[#ef4444]'
                          }`}
                          style={{ width: `${cr.percent}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-xs font-mono tabular-nums text-[#7A9982] dark:text-[#7BA88A]">
                        {cr.percent}%
                      </span>
                      {cr.hasActive && (
                        <Link
                          to="/prepare/interview-prep"
                          className="text-xs font-semibold text-[#059669] hover:underline"
                        >
                          {t('journey.continue', 'Continue')}
                        </Link>
                      )}
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {/* Quick links */}
          <Card className="section-enter" padding="lg">
            <h2 className="mb-3 text-base font-semibold text-[#111111] dark:text-[#E2F0E8]">
              {t('journey.quickActions', 'Quick actions')}
            </h2>
            <div className="flex flex-col gap-2">
              {[
                { href: '/daily-challenge', icon: <Flame className="h-4 w-4 text-emerald-500" />, label: t('journey.quick.daily', 'Daily Challenge') },
                { href: '/practice/arena', icon: <Swords className="h-4 w-4 text-[#059669]" />, label: t('journey.quick.arena', 'Duel') },
                { href: '/prepare/interview-prep', icon: <BookOpen className="h-4 w-4 text-[#059669]" />, label: t('journey.quick.mock', 'Mock Interview') },
                { href: '/prepare/interview-prep?category=algorithm', icon: <Code2 className="h-4 w-4 text-[#059669]" />, label: t('journey.quick.practice', 'Practice') },
              ].map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#111111] transition-colors hover:bg-[#f1f5f9] dark:text-[#E2F0E8] dark:hover:bg-[#1c2436]"
                >
                  {item.icon}
                  <span className="flex-1">{item.label}</span>
                  <ChevronRight className="h-4 w-4 text-[#C1CFC4] dark:text-[#1E4035]" />
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function buildCompetencyItems(data: ReadinessResponse | null): CompetencyBarItem[] {
  if (!data) return []

  // Try to reconstruct from weakest/strongest if we have them
  // The readiness endpoint returns individual competencies in weakest/strongest
  // We need to show all skills — use a static list with scores from data
  const SKILL_ORDER = [
    { key: 'slices', label: 'Algorithms' },
    { key: 'concurrency', label: 'Coding' },
    { key: 'sql', label: 'SQL' },
    { key: 'architecture', label: 'Code Review' },
    { key: 'system_design', label: 'System Design' },
  ]

  // Build a map from the data we have
  const scoreMap = new Map<string, number>()
  if (data.weakestSkill) scoreMap.set(data.weakestSkill.key, data.weakestSkill.score)
  if (data.strongestSkill) scoreMap.set(data.strongestSkill.key, data.strongestSkill.score)

  return SKILL_ORDER.map((s) => ({
    key: s.key,
    label: s.label,
    score: scoreMap.get(s.key) ?? 0,
  }))
}
