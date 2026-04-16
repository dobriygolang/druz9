import { useEffect, useState, useCallback } from 'react'
import {
  Flame, ChevronRight, Target, Calendar, Briefcase, Headphones, Map,
  Swords, GraduationCap, Code2, Send, BookOpen, Trophy, Award, CheckCircle2,
  Crown, Clock, ArrowRight, Zap, Star, BookMarked, Scroll,
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

// Infer icon for feed entries based on title keywords
function feedIcon(title: string): React.ElementType {
  const l = title.toLowerCase()
  if (l.includes('code') || l.includes('задач') || l.includes('алгоритм')) return Code2
  if (l.includes('interview') || l.includes('mock') || l.includes('собес') || l.includes('boss')) return Swords
  if (l.includes('quiz') || l.includes('тест') || l.includes('quiz')) return BookOpen
  if (l.includes('practic') || l.includes('arena') || l.includes('practice')) return Trophy
  return Scroll
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

            {/* Stat chips */}
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

            {/* CTA */}
            {primaryAction ? (
              <Link to={primaryAction.actionUrl} className="btn-journey">
                ▶ {t('home.hero.continue', 'Continue Journey')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link to="/practice" className="btn-journey">
                ▶ {t('home.hero.start', 'Start Training')}
                <Zap className="h-4 w-4" />
              </Link>
            )}
          </div>

          {/* ── Right: Current Focus (desktop only) ── */}
          <div className="hidden lg:flex flex-col gap-3 w-[152px] flex-shrink-0 pl-4 self-stretch border-l border-[#C8AC7E]/22 dark:border-[#3A5038]/28">
            <div>
              <p className="font-pixel text-[6px] uppercase tracking-[0.14em] text-[#8B7355] dark:text-[#7BA88A] mb-2">
                {t('home.hero.focus', 'Current Focus')}
              </p>
              {primaryAction ? (
                <Link
                  to={primaryAction.actionUrl}
                  className="block rounded-lg bg-white/42 dark:bg-black/18 border border-[#C8AC7E]/26 dark:border-[#3A5038]/28 p-2.5 hover:bg-white/65 dark:hover:bg-black/28 transition-colors"
                >
                  <div className="flex items-start gap-1.5 mb-1">
                    <div className="mt-0.5 w-4 h-4 rounded-sm bg-[#16A34A]/14 border border-[#16A34A]/22 flex items-center justify-center flex-shrink-0">
                      <ArrowRight className="w-2.5 h-2.5 text-[#16A34A] dark:text-[#34D399]" />
                    </div>
                    <p className="text-[10px] font-semibold text-[#2C1810] dark:text-[#E2F0E8] leading-tight line-clamp-2">
                      {primaryAction.title}
                    </p>
                  </div>
                  {primaryAction.description && (
                    <p className="text-[9px] text-[#7A6550] dark:text-[#5A8068] leading-snug line-clamp-2 pl-[22px]">
                      {primaryAction.description}
                    </p>
                  )}
                </Link>
              ) : (
                <div className="rounded-lg bg-white/30 dark:bg-black/12 border border-[#C8AC7E]/18 dark:border-[#3A5038]/20 p-2.5">
                  <p className="text-[9px] text-[#8B7355] dark:text-[#7BA88A] leading-snug">
                    {t('home.hero.noFocus', 'Pick a quest to begin')}
                  </p>
                </div>
              )}
            </div>

            {/* Pixel sword — subtle world accent */}
            <div className="mt-auto flex justify-center opacity-[0.22] dark:opacity-[0.16]">
              <svg width="22" height="42" viewBox="0 0 11 21" style={{ imageRendering: 'pixelated' }} xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="0" width="3" height="2" fill="#A08848"/>
                <rect x="3" y="2" width="5" height="1" fill="#C4A060"/>
                <rect x="4" y="3" width="3" height="1" fill="#B89050"/>
                <rect x="5" y="4" width="1" height="8" fill="#A07840"/>
                <rect x="4" y="4" width="3" height="8" fill="#B89050"/>
                <rect x="1" y="11" width="9" height="2" fill="#8B6A30"/>
                <rect x="4" y="13" width="3" height="1" fill="#7A5C28"/>
                <rect x="5" y="14" width="1" height="7" fill="#5A4020"/>
                <rect x="4" y="14" width="3" height="7" fill="#6B4E28"/>
                <rect x="3" y="20" width="5" height="1" fill="#4A3418"/>
              </svg>
            </div>
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
                  <div className="path-content pb-2">
                    <div className="flex items-center gap-1.5">
                      <p className={`text-xs font-semibold truncate transition-colors ${
                        i === 0
                          ? 'text-[#2C1810] dark:text-[#E2F0E8] group-hover:text-[#16A34A] dark:group-hover:text-[#34D399]'
                          : 'text-[#5A4A40] dark:text-[#9ABAA8]'
                      }`}>
                        {action.title}
                      </p>
                      {i === 0 && (
                        <span className="flex-shrink-0 rounded-sm bg-[#16A34A]/12 dark:bg-[#34D399]/10 border border-[#16A34A]/20 dark:border-[#34D399]/15 px-1 py-px text-[7px] font-bold uppercase tracking-wider text-[#15803D] dark:text-[#34D399]">
                          Next
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-[#7A6550] dark:text-[#6A9880] truncate mt-0.5">
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
                {t('home.feed.viewAll', 'All entries →')}
              </Link>
            </div>
            <div className="flex flex-col gap-0.5">
              {feed.map((item, i) => {
                const EntryIcon = feedIcon(item.title)
                const pips = item.score != null ? Math.round(item.score / 2) : 0
                return (
                  <div key={i} className="guild-log-entry">
                    <div className="guild-log-icon">
                      <EntryIcon className="h-3 w-3 text-[#16A34A] dark:text-[#34D399]" />
                    </div>
                    <p className="min-w-0 flex-1 truncate text-xs text-[#2C1810] dark:text-[#C1D9CA]">
                      {item.title}
                    </p>
                    {item.score != null && (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <div className="guild-log-score-bar">
                          {Array.from({ length: 5 }, (_, j) => (
                            <div
                              key={j}
                              className={`guild-log-score-pip ${j < pips ? 'active' : ''}`}
                            />
                          ))}
                        </div>
                        <span className="guild-log-score">{item.score}/10</span>
                      </div>
                    )}
                  </div>
                )
              })}
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
                  {t('home.weeklyBoss.name', 'Weekly Boss Fight')}
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
          { to: '/community/events',    icon: Calendar,   label: t('home.quick.events',    'Events'),   sub: t('home.quick.events.sub',    'Guild Events') },
          { to: '/community/vacancies', icon: Briefcase,  label: t('home.quick.vacancies', 'Jobs'),     sub: t('home.quick.vacancies.sub', 'Find Roles') },
          { to: '/community/podcasts',  icon: Headphones, label: t('home.quick.podcasts',  'Podcasts'), sub: t('home.quick.podcasts.sub',  'Tune In') },
          { to: '/community/map',       icon: Map,        label: t('home.quick.map',       'Map'),      sub: t('home.quick.map.sub',       'Explore World') },
        ].map(({ to, icon: Icon, label, sub }) => (
          <Link key={to} to={to} className="world-tile group">
            <div className="world-tile-icon">
              <Icon className="h-5 w-5 text-[#16A34A] dark:text-[#34D399]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[#2C1810] dark:text-[#E2F0E8] truncate">{label}</p>
              <p className="text-[9px] text-[#7A6550] dark:text-[#6A9880] truncate">{sub}</p>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-[#C8AC7E]/55 dark:text-[#3A5038]/70 flex-shrink-0 transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </div>
  )
}
