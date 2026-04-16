import { useEffect, useState, useCallback } from 'react'
import {
  Flame, ChevronRight, Target, Calendar, Briefcase, Headphones, Map,
  Swords, GraduationCap, Code2, Send, BookOpen, Trophy, Award, CheckCircle2,
  Crown, Clock, ArrowRight, Zap, Star, BookMarked,
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
  const [progress, setProgress]   = useState<ProfileProgress | null>(null)
  const [missions, setMissions]   = useState<DailyMissionsResponse | null>(null)
  const [arenaStats, setArenaStats] = useState<ArenaStats | null>(null)
  const [feed, setFeed]           = useState<FeedItem[]>([])
  const [weeklyBoss, setWeeklyBoss] = useState<{
    weekKey: string; endsAt: string
    myEntry: { aiScore: number; solveTimeMs: number } | null
  } | null>(null)
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

  if (error) return <ErrorState message={error} onRetry={() => { setError(null); fetchData() }} />

  const firstName    = user?.firstName || user?.username || t('home.defaultName')
  const ov           = progress?.overview
  const league       = arenaStats?.league ?? ''
  const leagueLabel  = LEAGUE_LABELS[league] ?? ''
  const levelProgress = ov?.levelProgress ?? 0
  const primaryAction = progress?.nextActions?.[0]

  const daysLeft = weeklyBoss?.endsAt
    ? Math.max(0, Math.floor((new Date(weeklyBoss.endsAt).getTime() - Date.now()) / 86_400_000))
    : null

  return (
    <div className="flex min-h-full flex-col gap-4 px-4 pb-6 pt-4 md:gap-5 md:px-6 md:py-5">
      <PageMeta title={t('home.meta.title')} description={t('home.meta.description')} canonicalPath="/home" />

      {/* ══ CHARACTER PANEL ════════════════════════════════════════════════ */}
      <section className="char-panel section-enter p-4 md:p-5">
        <div className="flex items-start gap-4 md:gap-5">

          {/* Avatar + mascot */}
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
              size={38}
              className="hidden md:block"
            />
          </div>

          {/* Character info */}
          <div className="min-w-0 flex-1">

            {/* Name + level badge */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <div className="char-level-badge">LV.{ov?.level ?? 0}</div>
              <h1 className="text-[15px] font-bold text-[#2C1810] dark:text-[#E2F0E8] truncate">
                {firstName}
              </h1>
              {leagueLabel && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/55 dark:bg-white/5 border border-[#C4A878]/40 dark:border-[#3A5038]/50 px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#6B5A47] dark:text-[#7BA88A]">
                  <span className={`h-1.5 w-1.5 rounded-full ${LEAGUE_BG_COLORS[league] ?? 'bg-[#8B7355]'}`} />
                  {leagueLabel}
                  {arenaStats?.rating != null && ` · ${arenaStats.rating}`}
                </span>
              )}
            </div>

            {/* XP bar */}
            <div className="flex items-center gap-2.5 mb-3">
              <div className="xp-bar flex-1 max-w-[220px]">
                {Array.from({ length: 10 }, (_, i) => (
                  <div
                    key={i}
                    className={`xp-bar-segment ${i / 10 < levelProgress ? 'filled' : ''}`}
                  />
                ))}
              </div>
              <span className="font-mono text-[10px] font-bold tabular-nums text-[#15803D] dark:text-[#34D399]">
                {ov?.totalXp ?? 0} XP
              </span>
            </div>

            {/* Stat chips — friendly, not HUD-techy */}
            <div className="flex flex-wrap items-center gap-2 mb-3.5">
              {(ov?.currentStreakDays ?? 0) > 0 && (
                <div className="char-stat-chip">
                  <Flame className="h-3.5 w-3.5 text-[#EA580C] flex-shrink-0" />
                  <div className="flex flex-col">
                    <span className="char-stat-val">{ov!.currentStreakDays}d</span>
                    <span className="char-stat-lbl">streak</span>
                  </div>
                </div>
              )}
              {arenaStats?.rating != null && (
                <div className="char-stat-chip">
                  <Trophy className="h-3.5 w-3.5 text-[#D97706] flex-shrink-0" />
                  <div className="flex flex-col">
                    <span className="char-stat-val">{arenaStats.rating}</span>
                    <span className="char-stat-lbl">rating</span>
                  </div>
                </div>
              )}
              {missions && (
                <div className="char-stat-chip">
                  <Target className="h-3.5 w-3.5 text-[#6B5A47] dark:text-[#7BA88A] flex-shrink-0" />
                  <div className="flex flex-col">
                    <span className="char-stat-val">{missions.completedCount}/{missions.missions.length}</span>
                    <span className="char-stat-lbl">quests</span>
                  </div>
                </div>
              )}
            </div>

            {/* Continue Journey CTA */}
            {primaryAction ? (
              <Link to={primaryAction.actionUrl} className="btn-journey">
                ▶ Continue Journey
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link to="/practice" className="btn-journey">
                ▶ Start Training
                <Zap className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ══ QUEST BOARD ════════════════════════════════════════════════════ */}
      <section className="quest-board-rpg section-enter">

        {/* Board header — pinned notice style */}
        <div className="quest-board-rpg-hdr">
          <div className="flex items-center gap-2">
            {/* Pin tack */}
            <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] shadow-sm flex-shrink-0" style={{ boxShadow: '0 1px 3px rgba(245,158,11,0.45)' }} />
            <h2 className="font-pixel text-[8px] text-[#6B4D28] dark:text-[#C4A878] tracking-wider uppercase">
              {t('home.missions.title', 'Daily Quests')}
            </h2>
          </div>
          {missions && (
            <div className="flex items-center gap-2">
              <div className="quest-board-prog-track">
                <div
                  className="quest-board-prog-fill"
                  style={{ width: `${missions.missions.length > 0 ? (missions.completedCount / missions.missions.length) * 100 : 0}%` }}
                />
              </div>
              <span className="font-mono text-[10px] font-bold tabular-nums text-[#15803D] dark:text-[#34D399]">
                {missions.completedCount}/{missions.missions.length}
              </span>
            </div>
          )}
        </div>

        {/* Quest items */}
        <div className="flex flex-col gap-2 p-3">
          {missions?.missions.map((mission) => {
            const Icon = MISSION_ICONS[mission.icon] ?? Target
            const hasBar = mission.targetValue > 1
            const fillPct = hasBar
              ? Math.min(mission.current / mission.targetValue, 1) * 100
              : mission.completed ? 100 : 0

            return (
              <div key={mission.key} className={`quest-item-rpg ${mission.completed ? 'is-done' : ''}`}>

                {/* Icon container */}
                <div className={`quest-icon-rpg ${mission.completed ? 'done' : ''}`}>
                  {mission.completed
                    ? <CheckCircle2 className="h-4 w-4 text-[#16A34A] dark:text-[#34D399]" />
                    : <Icon className="h-4 w-4 text-[#8B7355] dark:text-[#7BA88A]" />
                  }
                </div>

                {/* Title + progress */}
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-semibold leading-tight ${
                    mission.completed
                      ? 'text-[#16A34A] dark:text-[#34D399] line-through decoration-[#16A34A]/30'
                      : 'text-[#2C1810] dark:text-[#E2F0E8]'
                  }`}>
                    {mission.title}
                  </p>
                  {hasBar && (
                    <>
                      <div className="quest-bar-rpg">
                        <div className="quest-bar-fill-rpg" style={{ width: `${fillPct}%` }} />
                      </div>
                      {!mission.completed && (
                        <span className="text-[9px] tabular-nums text-[#8B7355] dark:text-[#7BA88A]">
                          {Math.min(mission.current, mission.targetValue)}/{mission.targetValue}
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Reward + action */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="xp-reward-badge">+{mission.xpReward} XP</span>
                  {!mission.completed && (
                    <Link to={mission.actionUrl} className="btn-quest-rpg">
                      Go →
                    </Link>
                  )}
                </div>
              </div>
            )
          }) ?? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="quest-item-rpg h-14 animate-pulse" />
            ))
          )}
        </div>

        {/* All done! */}
        {missions?.allComplete && (
          <div className="quest-done-bar mx-3 mb-3">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            <span>
              {t('home.missions.allDone', 'All quests complete! Bonus: +{{xp}} XP', { xp: missions.bonusXp })}
            </span>
          </div>
        )}
      </section>

      {/* ══ ADVENTURE PATH + GUILD LOG ═════════════════════════════════════ */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Adventure Path — where to go next */}
        {(progress?.nextActions?.length ?? 0) > 0 && (
          <div className="adventure-path section-enter p-4">
            <div className="flex items-center gap-2 mb-4">
              <BookMarked className="h-3.5 w-3.5 text-[#16A34A] dark:text-[#34D399] flex-shrink-0" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#15803D] dark:text-[#34D399]">
                {t('home.nextActions.title', 'Training Path')}
              </h2>
            </div>

            <div className="flex flex-col">
              {progress!.nextActions!.slice(0, 3).map((action, i, arr) => (
                <Link key={i} to={action.actionUrl} className="path-step group">
                  <div className="path-step-track">
                    <div className={`path-node ${i === 0 ? 'active' : ''}`}>
                      {i === 0 ? '▶' : String(i + 1)}
                    </div>
                    {i < arr.length - 1 && <div className="path-connector" />}
                  </div>
                  <div className={`path-content pb-2 ${i < arr.length - 1 ? '' : ''}`}>
                    <p className={`text-xs font-semibold truncate transition-colors ${
                      i === 0
                        ? 'text-[#2C1810] dark:text-[#E2F0E8] group-hover:text-[#16A34A] dark:group-hover:text-[#34D399]'
                        : 'text-[#6B5A47] dark:text-[#7BA88A]'
                    }`}>
                      {action.title}
                    </p>
                    <p className="text-[10px] text-[#8B7355] dark:text-[#4A7058] truncate">
                      {action.description}
                    </p>
                  </div>
                  {i === 0 && (
                    <ArrowRight className="h-3 w-3 flex-shrink-0 mt-1 text-[#16A34A] dark:text-[#34D399] opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5" />
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Guild Log — recent activity */}
        {feed.length > 0 && (
          <div className="guild-log section-enter p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="h-3.5 w-3.5 text-[#D97706] dark:text-[#FBBF24] flex-shrink-0" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-[#6B4D28] dark:text-[#C4A878]">
                  {t('home.feed.title', 'Adventure Log')}
                </h2>
              </div>
              <Link
                to="/profile"
                className="text-[10px] font-semibold text-[#15803D] dark:text-[#34D399] hover:underline"
              >
                {t('home.feed.viewAll', 'View all')}
              </Link>
            </div>
            <div className="flex flex-col gap-0.5">
              {feed.map((item, i) => (
                <div key={i} className="guild-log-entry">
                  <div className="guild-log-dot" />
                  <p className="min-w-0 flex-1 truncate text-xs text-[#2C1810] dark:text-[#C1D9CA]">
                    {item.title}
                  </p>
                  {item.score != null && (
                    <span className="guild-log-score">{item.score}/10</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ══ WEEKLY EVENT BANNER ════════════════════════════════════════════ */}
      {weeklyBoss && (
        <Link to="/practice/weekly-boss" className="section-enter block group">
          <div className="event-banner">
            <div className="relative z-10 flex items-center gap-4 p-4 md:p-5">

              {/* Boss icon */}
              <div className="event-boss-icon">
                <Crown className="h-6 w-6 text-[#D97706] dark:text-[#FBBF24]" />
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="font-pixel text-[7px] text-[#92400E] dark:text-[#FBBF24] tracking-widest uppercase mb-1">
                  ⚔ {t('home.weeklyBoss.title', 'Weekly Challenge')} ⚔
                </p>
                <p className="text-sm font-bold text-[#2C1810] dark:text-[#E2F0E8] mb-0.5 truncate">
                  Senior Engineer Boss Fight
                </p>
                <p className="text-xs text-[#8B7355] dark:text-[#7BA88A]">
                  {weeklyBoss.myEntry
                    ? t('home.weeklyBoss.yourScore', 'Your best: {{score}}/10 — challenge again?', { score: weeklyBoss.myEntry.aiScore })
                    : t('home.weeklyBoss.notAttempted', 'Not attempted yet — take on the challenge!')}
                </p>
              </div>

              {/* Timer + CTA */}
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                {daysLeft !== null && (
                  <span className="flex items-center gap-1 font-mono text-[10px] font-bold tabular-nums text-[#92400E] dark:text-[#FBBF24]">
                    <Clock className="h-3 w-3" />
                    {daysLeft}d left
                  </span>
                )}
                <div className="btn-event">
                  Enter <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* ══ WORLD MAP — Quick nav ═══════════════════════════════════════════ */}
      <div className="section-enter grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { to: '/community/events',    icon: Calendar,   label: t('home.quick.events',    'Events'),   sub: 'Community' },
          { to: '/community/vacancies', icon: Briefcase,  label: t('home.quick.vacancies', 'Jobs'),     sub: 'Vacancies' },
          { to: '/community/podcasts',  icon: Headphones, label: t('home.quick.podcasts',  'Podcasts'), sub: 'Listen' },
          { to: '/community/map',       icon: Map,        label: t('home.quick.map',       'Map'),      sub: 'World' },
        ].map(({ to, icon: Icon, label, sub }) => (
          <Link key={to} to={to} className="world-tile">
            <div className="world-tile-icon">
              <Icon className="h-4 w-4 text-[#16A34A] dark:text-[#34D399]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#2C1810] dark:text-[#E2F0E8] truncate">{label}</p>
              <p className="text-[9px] text-[#8B7355] dark:text-[#7BA88A]">{sub}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
