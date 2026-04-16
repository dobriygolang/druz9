import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Flame, ChevronRight, Target, Calendar, Briefcase, Headphones, Map,
  Swords, GraduationCap, Code2, Send, BookOpen, Trophy, Award, CheckCircle2,
  Crown, Clock, ArrowRight,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/app/providers/AuthProvider'
import { authApi } from '@/features/Auth/api/authApi'
import { missionApi } from '@/features/Mission/api/missionApi'
import { arenaApi } from '@/features/Arena/api/arenaApi'
import { apiClient } from '@/shared/api/base'
import { PlayerFrame } from '@/shared/ui/PlayerFrame'
import { PixelGardener } from '@/shared/ui/PixelGardener'
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
      authApi.getProfileFeed(user.id).then(f => setFeed(f.slice(0, 5))).catch(() => {}),
      apiClient.get('/api/v1/challenges/weekly').then(r => setWeeklyBoss(r.data)).catch(() => {}),
    ]).catch(() => setError(t('common.loadFailed')))
  }, [user?.id, t])

  useEffect(() => { fetchData() }, [fetchData])

  const firstName = user?.firstName || user?.username || t('home.defaultName')

  if (error) return <ErrorState message={error} onRetry={() => { setError(null); fetchData() }} />

  const ov = progress?.overview
  const league = arenaStats?.league ?? ''
  const leagueLabel = LEAGUE_LABELS[league] ?? ''
  const levelProgress = ov?.levelProgress ?? 0
  const xpSegments = 10

  // Best next action for hero CTA
  const primaryAction = progress?.nextActions?.[0]

  return (
    <div className="flex min-h-full flex-col gap-5 px-4 pb-6 pt-4 md:gap-6 md:px-8 md:py-6">
      <PageMeta title={t('home.meta.title')} description={t('home.meta.description')} canonicalPath="/home" />

      {/* ═══ HERO PANEL ═══════════════════════════════════════════════ */}
      <section className="panel-hero section-enter p-4 md:p-5">
        <div className="flex items-start gap-4 md:gap-5">
          {/* Gardener + avatar */}
          <div className="flex flex-col items-center gap-2 flex-shrink-0">
            <Link to="/profile">
              <PlayerFrame
                name={firstName}
                src={user?.avatarUrl || undefined}
                league={LEAGUE_FRAME_NAMES[league]}
                size="lg"
              />
            </Link>
            <PixelGardener
              mood={(ov?.currentStreakDays ?? 0) > 0 ? 'watering' : 'idle'}
              size={40}
              className="hidden md:block"
            />
          </div>

          {/* Stats column */}
          <div className="min-w-0 flex-1">
            {/* Name + level */}
            <div className="flex items-center gap-2 mb-1">
              <span className="font-pixel text-[9px] text-[#059669] dark:text-[#34D399]">
                LV.{ov?.level ?? 0}
              </span>
              <span className="text-sm font-semibold text-[#111111] dark:text-[#E2F0E8] truncate">
                {firstName}
              </span>
            </div>

            {/* XP bar — segmented pixel style */}
            <div className="flex items-center gap-2 mb-2">
              <div className="xp-bar flex-1 max-w-[200px]">
                {Array.from({ length: xpSegments }, (_, i) => (
                  <div
                    key={i}
                    className={`xp-bar-segment ${i / xpSegments < levelProgress ? 'filled' : ''}`}
                  />
                ))}
              </div>
              <span className="font-mono text-[10px] font-bold tabular-nums text-[#059669] dark:text-[#34D399]">
                {ov?.totalXp ?? 0} XP
              </span>
            </div>

            {/* Stat chips */}
            <div className="flex flex-wrap items-center gap-2">
              {(ov?.currentStreakDays ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-[#f59e0b]/10 px-2 py-0.5 text-[10px] font-bold text-[#92400e] dark:bg-[#f59e0b]/15 dark:text-[#fbbf24]">
                  <Flame className="h-3 w-3" />
                  {ov?.currentStreakDays}d streak
                </span>
              )}
              {leagueLabel && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-white/40 px-2 py-0.5 text-[10px] font-medium text-[#4B6B52] dark:bg-white/5 dark:text-[#7BA88A]">
                  <span className={`h-1.5 w-1.5 rounded-full ${LEAGUE_BG_COLORS[league] ?? 'bg-[#7A9982]'}`} />
                  {leagueLabel}{arenaStats?.rating ? ` ${arenaStats.rating}` : ''}
                </span>
              )}
            </div>

            {/* Primary CTA */}
            {primaryAction && (
              <Link
                to={primaryAction.actionUrl}
                className="mt-3 inline-flex items-center gap-2 btn-wood !text-[8px] !py-2 !px-4"
              >
                {t('home.hero.continue', 'Continue')}
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ═══ QUEST BOARD — Daily Missions ═════════════════════════════ */}
      <section className="panel-quest section-enter p-4 md:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-pixel text-[8px] text-[#5A4A3A] dark:text-[#C1D9CA] tracking-wider uppercase">
            {t('home.missions.title', 'Daily Missions')}
          </h2>
          {missions && (
            <span className="font-mono text-[11px] font-bold tabular-nums text-[#059669] dark:text-[#34D399]">
              {missions.completedCount}/{missions.missions.length}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {missions?.missions.map((mission) => {
            const Icon = MISSION_ICONS[mission.icon] ?? Target
            const prog = mission.targetValue > 1
              ? `${Math.min(mission.current, mission.targetValue)}/${mission.targetValue}`
              : undefined

            return (
              <div
                key={mission.key}
                className={`quest-item flex items-center gap-3 px-3 py-2.5 ${mission.completed ? 'is-done' : ''}`}
              >
                <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${
                  mission.completed
                    ? 'bg-[#059669]/15 dark:bg-[#059669]/20'
                    : 'bg-white/40 dark:bg-white/5'
                }`}>
                  {mission.completed ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#059669] dark:text-[#34D399]" />
                  ) : (
                    <Icon className="h-3.5 w-3.5 text-[#7A9982] dark:text-[#7BA88A]" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-medium leading-tight ${
                    mission.completed
                      ? 'text-[#059669] dark:text-[#34D399] line-through decoration-[#059669]/30'
                      : 'text-[#111111] dark:text-[#E2F0E8]'
                  }`}>
                    {mission.title}
                  </p>
                  {prog && !mission.completed && (
                    <p className="text-[10px] tabular-nums text-[#7A9982] dark:text-[#7BA88A]">{prog}</p>
                  )}
                </div>

                <span className="flex-shrink-0 font-mono text-[10px] font-bold tabular-nums text-[#059669] dark:text-[#34D399]">
                  +{mission.xpReward}
                </span>

                {!mission.completed && (
                  <Link to={mission.actionUrl} className="flex-shrink-0 btn-wood !py-1 !px-2.5 !text-[7px]">
                    GO
                  </Link>
                )}
              </div>
            )
          }) ?? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="quest-item h-12 animate-pulse" />
            ))
          )}
        </div>

        {missions?.allComplete && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#059669]/10 px-3 py-2 dark:bg-[#059669]/15">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#059669] dark:text-[#34D399]" />
            <span className="font-pixel text-[7px] text-[#059669] dark:text-[#34D399]">
              {t('home.missions.allDone', 'All done! +{{xp}} XP bonus', { xp: missions.bonusXp })}
            </span>
          </div>
        )}
      </section>

      {/* ═══ NEXT QUEST + ACTIVITY LOG ════════════════════════════════ */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Next Quest */}
        {(progress?.nextActions?.length ?? 0) > 0 && (
          <div className="panel-game section-enter p-4">
            <h2 className="mb-3 font-pixel text-[8px] text-[#4B6B52] dark:text-[#7BA88A] tracking-wider uppercase">
              {t('home.nextActions.title', 'Next Quest')}
            </h2>
            <div className="flex flex-col gap-1.5">
              {progress!.nextActions!.slice(0, 3).map((action, i) => (
                <Link
                  key={i}
                  to={action.actionUrl}
                  className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-white/30 dark:hover:bg-white/5"
                >
                  <ArrowRight className="h-3 w-3 flex-shrink-0 text-[#059669] dark:text-[#34D399] transition-transform group-hover:translate-x-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-[#111111] dark:text-[#E2F0E8] truncate">{action.title}</p>
                    <p className="text-[10px] text-[#7A9982] dark:text-[#4A7058] truncate">{action.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Activity Log */}
        {feed.length > 0 && (
          <div className="panel-log section-enter p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-pixel text-[8px] text-[#4B6B52] dark:text-[#7BA88A] tracking-wider uppercase">
                {t('home.feed.title', 'Activity Log')}
              </h2>
              <Link to="/profile" className="text-[10px] font-medium text-[#059669] dark:text-[#34D399] hover:underline">
                {t('home.feed.viewAll', 'View all')}
              </Link>
            </div>
            <div className="flex flex-col gap-1">
              {feed.map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5">
                  <div className="h-1 w-1 rounded-full bg-[#059669]/40 dark:bg-[#34D399]/40 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-[#111111] dark:text-[#C1D9CA]">{item.title}</p>
                  </div>
                  {item.score != null && (
                    <span className="flex-shrink-0 font-mono text-[10px] font-bold text-[#059669] dark:text-[#34D399]">
                      {item.score}/10
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ═══ WEEKLY BOSS ══════════════════════════════════════════════ */}
      {weeklyBoss && (
        <Link to="/practice/weekly-boss" className="section-enter block group">
          <div className="panel-boss p-4 md:p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#f59e0b]/15 dark:bg-[#f59e0b]/10">
                <Crown className="h-5 w-5 text-[#f59e0b]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-pixel text-[8px] text-[#92400e] dark:text-[#fbbf24] tracking-wider uppercase mb-0.5">
                  {t('home.weeklyBoss.title', 'Weekly Boss')}
                </p>
                <p className="text-xs text-[#4B6B52] dark:text-[#7BA88A]">
                  {weeklyBoss.myEntry
                    ? t('home.weeklyBoss.yourScore', 'Your best: {{score}}/10', { score: weeklyBoss.myEntry.aiScore })
                    : t('home.weeklyBoss.notAttempted', 'Not attempted yet')}
                </p>
              </div>
              {weeklyBoss.endsAt && (
                <span className="flex-shrink-0 font-mono text-[10px] font-bold text-[#92400e] dark:text-[#fbbf24]">
                  <Clock className="mr-1 inline h-3 w-3" />
                  {Math.max(0, Math.floor((new Date(weeklyBoss.endsAt).getTime() - Date.now()) / 86_400_000))}d
                </span>
              )}
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-[#7A9982] transition-transform group-hover:translate-x-1 dark:text-[#7BA88A]" />
            </div>
          </div>
        </Link>
      )}

      {/* ═══ QUICK NAV TILES ══════════════════════════════════════════ */}
      <div className="section-enter grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { to: '/community/events', icon: Calendar, label: t('home.quick.events', 'Events') },
          { to: '/community/vacancies', icon: Briefcase, label: t('home.quick.vacancies', 'Jobs') },
          { to: '/community/podcasts', icon: Headphones, label: t('home.quick.podcasts', 'Podcasts') },
          { to: '/community/map', icon: Map, label: t('home.quick.map', 'Map') },
        ].map(({ to, icon: Icon, label }) => (
          <Link key={to} to={to} className="nav-tile flex items-center gap-2.5 px-3 py-3">
            <Icon className="h-4 w-4 text-[#059669] dark:text-[#34D399] flex-shrink-0" />
            <span className="text-xs font-medium text-[#4B6B52] dark:text-[#7BA88A]">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
