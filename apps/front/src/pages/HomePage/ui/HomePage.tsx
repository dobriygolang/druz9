import { useEffect, useState, useCallback } from 'react'
import {
  Flame, ChevronRight, Target, Calendar, Briefcase, Headphones, Map,
  Swords, GraduationCap, Code2, Send, BookOpen, Trophy, Award, CheckCircle2,
  Crown, Clock,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/app/providers/AuthProvider'
import { authApi } from '@/features/Auth/api/authApi'
import { missionApi } from '@/features/Mission/api/missionApi'
import { arenaApi } from '@/features/Arena/api/arenaApi'
import { apiClient } from '@/shared/api/base'
import { Card } from '@/shared/ui/Card'
import { PlayerFrame } from '@/shared/ui/PlayerFrame'
import { ErrorState } from '@/shared/ui/ErrorState'
import { PageMeta } from '@/shared/ui/PageMeta'
import type { ProfileProgress, FeedItem, NextAction } from '@/entities/User/model/types'
import type { DailyMissionsResponse, DailyMission } from '@/features/Mission/model/types'

import { LEAGUE_LABELS, LEAGUE_BG_COLORS, LEAGUE_FRAME_NAMES } from '@/shared/lib/league'

const MISSION_ICONS: Record<string, React.ElementType> = {
  Code2, Swords, GraduationCap, Flame, Calendar, Send, BookOpen, Trophy, Award, Target,
}

type ArenaStats = { rating?: number; league?: string; currentWinStreak?: number }

export function HomePage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [progress, setProgress] = useState<ProfileProgress | null>(null)
  const [missions, setMissions] = useState<DailyMissionsResponse | null>(null)
  const [arenaStats, setArenaStats] = useState<ArenaStats | null>(null)
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [weeklyBoss, setWeeklyBoss] = useState<{ weekKey: string; endsAt: string; myEntry: { aiScore: number; solveTimeMs: number } | null } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(() => {
    if (!user?.id) return
    setError(null)
    Promise.all([
      authApi.getProfileProgress(user.id).then(p => setProgress(p)),
      missionApi.getDailyMissions().then(m => setMissions(m)).catch(() => {}),
      arenaApi.getPlayerStats(user.id).then(s => { if (s) setArenaStats(s) }),
      authApi.getProfileFeed(user.id).then(f => setFeed(f.slice(0, 7))).catch(() => {}),
      apiClient.get('/api/v1/challenges/weekly').then(r => setWeeklyBoss(r.data)).catch(() => {}),
    ]).catch(() => setError(t('common.loadFailed')))
  }, [user?.id, t])

  useEffect(() => { fetchData() }, [fetchData])

  const firstName = user?.firstName || user?.username || t('home.defaultName')

  if (error) return <ErrorState message={error} onRetry={() => { setError(null); fetchData() }} />

  const ov = progress?.overview
  const league = arenaStats?.league ?? ''
  const leagueLabel = LEAGUE_LABELS[league] ?? ''

  return (
    <div className="flex min-h-full flex-col gap-4 px-4 pb-6 pt-4 md:gap-6 md:p-8">
      <PageMeta title={t('home.meta.title')} description={t('home.meta.description')} canonicalPath="/home" />

      {/* ── Player Card Strip ────────────────────────────────────────── */}
      <section className="section-enter rounded-2xl border border-[#CBCCC9] bg-white p-4 dark:border-[#1e3158] dark:bg-[#161c2d] md:p-5">
        <div className="flex items-center gap-4">
          <Link to="/profile" className="flex-shrink-0">
            <PlayerFrame
              name={firstName}
              src={user?.avatarUrl || undefined}
              league={LEAGUE_FRAME_NAMES[league]}
              size="lg"
            />
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-[#111111] dark:text-[#f8fafc]">
                Lv.{ov?.level ?? 0}
              </span>
              <div className="h-2 flex-1 max-w-[160px] rounded-full bg-[#E7E8E5] dark:bg-[#1e3158]">
                <div
                  className="h-2 rounded-full bg-[#6366F1] transition-all duration-500"
                  style={{ width: `${(ov?.levelProgress ?? 0) * 100}%` }}
                />
              </div>
              <span className="text-[11px] tabular-nums text-[#667085] dark:text-[#7e93b0]">
                {ov?.totalXp ?? 0} XP
              </span>
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              {(ov?.currentStreakDays ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#92400e] dark:text-[#fbbf24]">
                  <Flame className="h-3.5 w-3.5 text-[#f59e0b]" />
                  {ov?.currentStreakDays}d
                </span>
              )}
              {leagueLabel && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#475569] dark:text-[#94a3b8]">
                  <span className={`h-2 w-2 rounded-full ${LEAGUE_BG_COLORS[league] ?? 'bg-[#94a3b8]'}`} />
                  {leagueLabel}
                  {arenaStats?.rating ? ` ${arenaStats.rating}` : ''}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Daily Missions ───────────────────────────────────────────── */}
      <section className="section-enter">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#111111] dark:text-[#f8fafc]">
            {t('home.missions.title', 'Daily Missions')}
          </h2>
          {missions && (
            <span className="text-xs tabular-nums text-[#667085] dark:text-[#7e93b0]">
              {missions.completedCount}/{missions.missions.length}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {missions?.missions.map((mission) => (
            <MissionRow key={mission.key} mission={mission} />
          )) ?? (
            // Skeleton
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-[#F2F3F0] dark:bg-[#1a2236]" />
            ))
          )}
        </div>

        {missions?.allComplete && (
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-[#6366F1]/20 bg-[#eef2ff] px-3 py-2 dark:border-[#6366F1]/15 dark:bg-[#1a1a3e]">
            <CheckCircle2 className="h-4 w-4 text-[#6366F1]" />
            <span className="text-xs font-semibold text-[#6366F1]">
              {t('home.missions.allDone', 'All done! +{{xp}} XP bonus', { xp: missions.bonusXp })}
            </span>
          </div>
        )}
      </section>

      {/* ── Next Actions + Feed ──────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Next Actions */}
        {(progress?.nextActions?.length ?? 0) > 0 && (
          <Card className="section-enter" padding="lg">
            <h2 className="mb-3 text-sm font-semibold text-[#111111] dark:text-[#f8fafc]">
              {t('home.nextActions.title', 'What to do next')}
            </h2>
            <div className="flex flex-col gap-2">
              {progress!.nextActions!.slice(0, 3).map((action, i) => (
                <NextActionRow key={i} action={action} />
              ))}
            </div>
          </Card>
        )}

        {/* Activity Feed */}
        {feed.length > 0 && (
          <Card className="section-enter" padding="lg">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#111111] dark:text-[#f8fafc]">
                {t('home.feed.title', 'Recent Activity')}
              </h2>
              <Link to="/profile" className="text-xs font-semibold text-[#6366F1]">
                {t('home.feed.viewAll', 'View all')}
              </Link>
            </div>
            <div className="flex flex-col divide-y divide-[#E7E8E5] dark:divide-[#1e3158]">
              {feed.map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-[#111111] dark:text-[#f8fafc]">
                      {item.title}
                    </p>
                    {item.description && (
                      <p className="truncate text-[11px] text-[#667085] dark:text-[#7e93b0]">
                        {item.description}
                      </p>
                    )}
                  </div>
                  {item.score != null && (
                    <span className="flex-shrink-0 rounded-full bg-[#eef2ff] px-2 py-0.5 text-[10px] font-semibold text-[#6366F1] dark:bg-[#1a1a3e]">
                      {item.score}/10
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* ── Weekly Boss ────────────────────────────────────────────── */}
      {weeklyBoss && (
        <Link to="/practice/weekly-boss" className="section-enter block">
          <Card padding="md" className="group border-[#f59e0b]/20 hover:border-[#f59e0b]/40">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#fffbeb] dark:bg-[#2a200a]">
                <Crown className="h-5 w-5 text-[#f59e0b]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#111111] dark:text-[#f8fafc]">
                  {t('home.weeklyBoss.title', 'Weekly Boss Challenge')}
                </p>
                <p className="text-xs text-[#667085] dark:text-[#7e93b0]">
                  {weeklyBoss.myEntry
                    ? t('home.weeklyBoss.yourScore', 'Your best: {{score}}/10', { score: weeklyBoss.myEntry.aiScore })
                    : t('home.weeklyBoss.notAttempted', 'Not attempted yet — take on the hard challenge')}
                </p>
              </div>
              {weeklyBoss.endsAt && (
                <span className="flex-shrink-0 text-[10px] font-semibold text-[#92400e] dark:text-[#fbbf24]">
                  <Clock className="mr-1 inline h-3 w-3" />
                  {Math.max(0, Math.floor((new Date(weeklyBoss.endsAt).getTime() - Date.now()) / 86_400_000))}d left
                </span>
              )}
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-[#667085] transition-transform group-hover:translate-x-0.5 dark:text-[#7e93b0]" />
            </div>
          </Card>
        </Link>
      )}

      {/* ── Quick Links ──────────────────────────────────────────────── */}
      <div className="section-enter flex flex-wrap gap-2">
        <QuickLink to="/community/events" icon={Calendar} label={t('home.quick.events', 'Events')} />
        <QuickLink to="/community/vacancies" icon={Briefcase} label={t('home.quick.vacancies', 'Vacancies')} />
        <QuickLink to="/community/podcasts" icon={Headphones} label={t('home.quick.podcasts', 'Podcasts')} />
        <QuickLink to="/community/map" icon={Map} label={t('home.quick.map', 'Map')} />
      </div>
    </div>
  )
}

/* ── Sub-components ─────────────────────────────────────────────────── */

function MissionRow({ mission }: { mission: DailyMission }) {
  const Icon = MISSION_ICONS[mission.icon] ?? Target
  const progress = mission.targetValue > 1
    ? `${Math.min(mission.current, mission.targetValue)}/${mission.targetValue}`
    : undefined

  return (
    <div className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
      mission.completed
        ? 'border-[#6366F1]/20 bg-[#eef2ff] dark:border-[#6366F1]/15 dark:bg-[#1a1a3e]'
        : 'border-[#CBCCC9] bg-white hover:border-[#6366F1]/40 dark:border-[#1e3158] dark:bg-[#161c2d] dark:hover:border-[#6366F1]/30'
    }`}>
      <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
        mission.completed
          ? 'bg-[#6366F1]/10 dark:bg-[#6366F1]/20'
          : 'bg-[#F2F3F0] dark:bg-[#1a2236]'
      }`}>
        {mission.completed ? (
          <CheckCircle2 className="h-4 w-4 text-[#6366F1]" />
        ) : (
          <Icon className="h-4 w-4 text-[#667085] dark:text-[#7e93b0]" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className={`text-xs font-medium ${
          mission.completed
            ? 'text-[#6366F1] line-through decoration-[#6366F1]/40'
            : 'text-[#111111] dark:text-[#f8fafc]'
        }`}>
          {mission.title}
        </p>
        {progress && !mission.completed && (
          <p className="text-[10px] tabular-nums text-[#667085] dark:text-[#7e93b0]">{progress}</p>
        )}
      </div>

      <span className="flex-shrink-0 text-[10px] font-semibold tabular-nums text-[#6366F1]">
        +{mission.xpReward} XP
      </span>

      {!mission.completed && (
        <Link
          to={mission.actionUrl}
          className="flex-shrink-0 rounded-lg bg-[#111111] px-2.5 py-1.5 text-[10px] font-semibold text-white transition-colors hover:bg-[#333] dark:bg-white dark:text-[#111111] dark:hover:bg-[#e5e5e5]"
        >
          Go
        </Link>
      )}
    </div>
  )
}

function NextActionRow({ action }: { action: NextAction }) {
  return (
    <Link
      to={action.actionUrl}
      className="group flex items-center gap-3 rounded-xl border border-[#CBCCC9] bg-white px-3 py-2.5 transition-colors hover:border-[#6366F1]/40 dark:border-[#1e3158] dark:bg-[#161c2d] dark:hover:border-[#6366F1]/30"
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-[#111111] dark:text-[#f8fafc]">{action.title}</p>
        <p className="truncate text-[10px] text-[#667085] dark:text-[#7e93b0]">{action.description}</p>
      </div>
      <ChevronRight className="h-4 w-4 flex-shrink-0 text-[#667085] transition-transform group-hover:translate-x-0.5 dark:text-[#7e93b0]" />
    </Link>
  )
}

function QuickLink({ to, icon: Icon, label }: { to: string; icon: React.ElementType; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 rounded-full border border-[#CBCCC9] bg-white px-3 py-1.5 text-xs font-medium text-[#475569] transition-colors hover:border-[#6366F1] hover:text-[#6366F1] dark:border-[#1e3158] dark:bg-[#161c2d] dark:text-[#94a3b8] dark:hover:border-[#6366F1] dark:hover:text-[#818cf8]"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Link>
  )
}
