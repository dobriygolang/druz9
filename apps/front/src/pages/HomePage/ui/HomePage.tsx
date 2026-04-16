import { useEffect, useState, useCallback } from 'react'
import {
  Flame, ChevronRight, Target, Calendar, Briefcase, Headphones, Map,
  Swords, GraduationCap, Code2, Send, BookOpen, Trophy, Award, CheckCircle2,
  Crown, Clock, ArrowRight, Zap,
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
import type { ProfileProgress, FeedItem } from '@/entities/User/model/types'
import type { DailyMissionsResponse } from '@/features/Mission/model/types'

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
  const primaryAction = progress?.nextActions?.[0]

  return (
    <div className="flex min-h-full flex-col gap-4 px-4 pb-6 pt-4 md:gap-5 md:px-6 md:py-5">
      <PageMeta title={t('home.meta.title')} description={t('home.meta.description')} canonicalPath="/home" />

      {/* ══ PLAYER HUD ═══════════════════════════════════════════════════════ */}
      <section className="player-hud section-enter">
        <div className="flex items-center gap-4 p-4 md:p-5">

          {/* Avatar column */}
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
              size={36}
              className="hidden md:block"
            />
          </div>

          {/* HUD info column */}
          <div className="min-w-0 flex-1">

            {/* Name row */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <div className="level-badge">LV.{ov?.level ?? 0}</div>
              <span className="text-sm font-bold text-[#111111] dark:text-[#E2F0E8] truncate">
                {firstName}
              </span>
              {leagueLabel && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/40 dark:bg-white/5 border border-[#C1CFC4]/50 dark:border-[#1E4035]/60 px-2.5 py-0.5 text-[9px] font-medium text-[#4B6B52] dark:text-[#7BA88A]">
                  <span className={`h-1.5 w-1.5 rounded-full ${LEAGUE_BG_COLORS[league] ?? 'bg-[#7A9982]'}`} />
                  {leagueLabel}
                </span>
              )}
            </div>

            {/* XP bar */}
            <div className="flex items-center gap-2.5 mb-3">
              <div className="xp-bar flex-1 max-w-[220px]">
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

            {/* Stat readouts */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {(ov?.currentStreakDays ?? 0) > 0 && (
                <div className="hud-stat">
                  <Flame className="h-3.5 w-3.5 text-[#f59e0b] flex-shrink-0" />
                  <div className="hud-stat-inner">
                    <span className="hud-stat-value">{ov!.currentStreakDays}d</span>
                    <span className="hud-stat-label">STREAK</span>
                  </div>
                </div>
              )}
              {arenaStats?.rating != null && (
                <div className="hud-stat">
                  <Trophy className="h-3.5 w-3.5 text-[#059669] dark:text-[#34D399] flex-shrink-0" />
                  <div className="hud-stat-inner">
                    <span className="hud-stat-value">{arenaStats.rating}</span>
                    <span className="hud-stat-label">RATING</span>
                  </div>
                </div>
              )}
              {missions && (
                <div className="hud-stat">
                  <Target className="h-3.5 w-3.5 text-[#7A9982] dark:text-[#7BA88A] flex-shrink-0" />
                  <div className="hud-stat-inner">
                    <span className="hud-stat-value">{missions.completedCount}/{missions.missions.length}</span>
                    <span className="hud-stat-label">QUESTS</span>
                  </div>
                </div>
              )}
            </div>

            {/* Primary CTA */}
            {primaryAction ? (
              <Link to={primaryAction.actionUrl} className="btn-continue">
                CONTINUE
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <Link to="/practice" className="btn-continue">
                START QUEST
                <Zap className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ══ QUEST BOARD — Daily Missions ═════════════════════════════════════ */}
      <section className="quest-board-panel section-enter">

        {/* Board header */}
        <div className="quest-board-header">
          <div className="flex items-center gap-2">
            <div className="board-pin" />
            <h2 className="font-pixel text-[8px] text-[#5A4A3A] dark:text-[#C4A87C] tracking-wider uppercase">
              {t('home.missions.title', 'Quest Board')}
            </h2>
          </div>
          {missions && (
            <div className="flex items-center gap-2">
              <div className="board-progress-track">
                <div
                  className="board-progress-fill"
                  style={{ width: `${missions.missions.length > 0 ? (missions.completedCount / missions.missions.length) * 100 : 0}%` }}
                />
              </div>
              <span className="font-mono text-[10px] font-bold tabular-nums text-[#059669] dark:text-[#34D399]">
                {missions.completedCount}/{missions.missions.length}
              </span>
            </div>
          )}
        </div>

        {/* Quest cards */}
        <div className="flex flex-col gap-2 p-3">
          {missions?.missions.map((mission) => {
            const Icon = MISSION_ICONS[mission.icon] ?? Target
            const hasProgress = mission.targetValue > 1
            const fillPct = hasProgress
              ? Math.min(mission.current / mission.targetValue, 1) * 100
              : (mission.completed ? 100 : 0)

            return (
              <div
                key={mission.key}
                className={`quest-card ${mission.completed ? 'is-done' : ''}`}
              >
                {/* Icon */}
                <div className={`quest-icon-wrap ${mission.completed ? 'done' : ''}`}>
                  {mission.completed
                    ? <CheckCircle2 className="h-4 w-4 text-[#059669] dark:text-[#34D399]" />
                    : <Icon className="h-4 w-4 text-[#7A9982] dark:text-[#7BA88A]" />
                  }
                </div>

                {/* Title + progress */}
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-semibold leading-tight ${
                    mission.completed
                      ? 'text-[#059669] dark:text-[#34D399] line-through decoration-[#059669]/30'
                      : 'text-[#111111] dark:text-[#E2F0E8]'
                  }`}>
                    {mission.title}
                  </p>
                  {hasProgress && (
                    <>
                      <div className="quest-mini-progress">
                        <div className="quest-mini-fill" style={{ width: `${fillPct}%` }} />
                      </div>
                      {!mission.completed && (
                        <span className="text-[9px] tabular-nums text-[#7A9982] dark:text-[#7BA88A]">
                          {Math.min(mission.current, mission.targetValue)}/{mission.targetValue}
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* XP + action */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="xp-badge">+{mission.xpReward}</span>
                  {!mission.completed && (
                    <Link to={mission.actionUrl} className="quest-go-btn">GO</Link>
                  )}
                </div>
              </div>
            )
          }) ?? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="quest-card h-14 animate-pulse" />
            ))
          )}
        </div>

        {/* All quests done */}
        {missions?.allComplete && (
          <div className="quest-board-complete mx-3 mb-3">
            <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="font-pixel text-[7px]">
              {t('home.missions.allDone', 'ALL QUESTS DONE! +{{xp}} XP BONUS', { xp: missions.bonusXp })}
            </span>
          </div>
        )}
      </section>

      {/* ══ TRAINING ROUTE + EXPEDITION LOG ══════════════════════════════════ */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Training Route */}
        {(progress?.nextActions?.length ?? 0) > 0 && (
          <div className="journey-panel section-enter p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-[#059669]/20 dark:bg-[#34D399]/10 border-2 border-[#059669]/50 dark:border-[#34D399]/30 flex-shrink-0" />
              <h2 className="font-pixel text-[8px] text-[#4B6B52] dark:text-[#7BA88A] tracking-wider uppercase">
                {t('home.nextActions.title', 'Training Route')}
              </h2>
            </div>

            <div className="flex flex-col">
              {progress!.nextActions!.slice(0, 3).map((action, i, arr) => (
                <Link
                  key={i}
                  to={action.actionUrl}
                  className="journey-step group"
                >
                  <div className="journey-step-track">
                    <div className={`journey-node ${i === 0 ? 'active' : ''}`}>
                      {i === 0 ? '▶' : String(i + 1)}
                    </div>
                    {i < arr.length - 1 && <div className="journey-connector" />}
                  </div>
                  <div className="journey-step-content pb-2">
                    <p className={`text-xs font-semibold truncate transition-colors ${
                      i === 0
                        ? 'text-[#111111] dark:text-[#E2F0E8] group-hover:text-[#059669] dark:group-hover:text-[#34D399]'
                        : 'text-[#4B6B52] dark:text-[#7BA88A]'
                    }`}>
                      {action.title}
                    </p>
                    <p className="text-[10px] text-[#7A9982] dark:text-[#7BA88A] truncate">
                      {action.description}
                    </p>
                  </div>
                  {i === 0 && (
                    <ArrowRight className="h-3 w-3 flex-shrink-0 mt-1 text-[#059669] dark:text-[#34D399] transition-transform group-hover:translate-x-0.5" />
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Expedition Log */}
        {feed.length > 0 && (
          <div className="expedition-log section-enter p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-pixel text-[8px] text-[#4B6B52] dark:text-[#7BA88A] tracking-wider uppercase">
                {t('home.feed.title', 'Expedition Log')}
              </h2>
              <Link
                to="/profile"
                className="text-[10px] font-medium text-[#059669] dark:text-[#34D399] hover:underline"
              >
                {t('home.feed.viewAll', 'View all')}
              </Link>
            </div>
            <div className="flex flex-col gap-0.5">
              {feed.map((item, i) => (
                <div key={i} className="log-entry">
                  <div className="log-dot" />
                  <p className="min-w-0 flex-1 truncate text-xs text-[#111111] dark:text-[#C1D9CA]">
                    {item.title}
                  </p>
                  {item.score != null && (
                    <span className="log-score">{item.score}/10</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ══ WEEKLY RAID BANNER ════════════════════════════════════════════════ */}
      {weeklyBoss && (
        <Link to="/practice/weekly-boss" className="section-enter block group">
          <div className="raid-banner">
            <div className="raid-banner-glow" />
            <div className="relative z-10 flex items-center gap-4 p-4 md:p-5">

              {/* Boss icon */}
              <div className="raid-boss-icon">
                <Crown className="h-6 w-6 text-[#f59e0b] dark:text-[#fbbf24]" />
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="font-pixel text-[7px] text-[#92400e] dark:text-[#fbbf24] tracking-widest uppercase mb-1">
                  ⚠ {t('home.weeklyBoss.title', 'Weekly Raid')} ⚠
                </p>
                <p className="text-sm font-bold text-[#111111] dark:text-[#E2F0E8] mb-0.5 truncate">
                  Senior Engineer Challenge
                </p>
                <p className="text-xs text-[#7A9982] dark:text-[#7BA88A]">
                  {weeklyBoss.myEntry
                    ? t('home.weeklyBoss.yourScore', 'Your best: {{score}}/10', { score: weeklyBoss.myEntry.aiScore })
                    : t('home.weeklyBoss.notAttempted', 'Not attempted — join the raid')}
                </p>
              </div>

              {/* Timer + CTA */}
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                {weeklyBoss.endsAt && (
                  <span className="flex items-center gap-1 font-mono text-[10px] font-bold tabular-nums text-[#92400e] dark:text-[#fbbf24]">
                    <Clock className="h-3 w-3" />
                    {Math.max(0, Math.floor((new Date(weeklyBoss.endsAt).getTime() - Date.now()) / 86_400_000))}d left
                  </span>
                )}
                <div className="raid-enter-btn">
                  ENTER <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* ══ WORLD PORTALS — Quick nav ══════════════════════════════════════════ */}
      <div className="section-enter grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { to: '/community/events',    icon: Calendar,   label: t('home.quick.events',    'Events'),   sub: 'Community' },
          { to: '/community/vacancies', icon: Briefcase,  label: t('home.quick.vacancies', 'Jobs'),     sub: 'Vacancies' },
          { to: '/community/podcasts',  icon: Headphones, label: t('home.quick.podcasts',  'Podcasts'), sub: 'Listen' },
          { to: '/community/map',       icon: Map,        label: t('home.quick.map',       'Map'),      sub: 'World' },
        ].map(({ to, icon: Icon, label, sub }) => (
          <Link key={to} to={to} className="world-portal">
            <div className="portal-icon">
              <Icon className="h-4 w-4 text-[#059669] dark:text-[#34D399]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#111111] dark:text-[#E2F0E8] truncate">{label}</p>
              <p className="text-[9px] text-[#7A9982] dark:text-[#7BA88A]">{sub}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
