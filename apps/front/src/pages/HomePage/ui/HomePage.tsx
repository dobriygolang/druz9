import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/app/providers/AuthProvider'
import { authApi } from '@/features/Auth/api/authApi'
import { missionApi } from '@/features/Mission/api/missionApi'
import { arenaApi } from '@/features/Arena/api/arenaApi'
import { apiClient } from '@/shared/api/base'
import { PlayerFrame } from '@/shared/ui/PlayerFrame'
import { ErrorState } from '@/shared/ui/ErrorState'
import { PageMeta } from '@/shared/ui/PageMeta'
import { Sprite } from '@/shared/ui/Sprite'
import type { ProfileProgress } from '@/entities/User/model/types'
import type { DailyMissionsResponse } from '@/features/Mission/model/types'
import { LEAGUE_LABELS, LEAGUE_FRAME_NAMES } from '@/shared/lib/league'
import {
  TAVERN_P, TAVERN_D, TOWER_P, TOWER_D, PLAYER_P, PLAYER_D,
  NPC_P, NPC_D, CAT_P, CAT_D, TREE_OAK_P, TREE_OAK_D,
  TREE_PINE_P, TREE_PINE_D, BOARD_P, BOARD_D, SIGN_P, SIGN_D,
  PORTAL_P, PORTAL_D, FIRE_P, FIRE_D, WATERFALL_P, WATERFALL_D,
  LANTERN_P, LANTERN_D, FLOWERS_P, FLOWERS_D, BARREL_P, BARREL_D,
  CLOUD_P, CLOUD_D, GARDEN_P, gardenStage,
} from '@/shared/lib/sprites'
import './home-scene.css'

type ArenaStats = { rating?: number; league?: string; currentWinStreak?: number }

export function HomePage() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const [progress, setProgress] = useState<ProfileProgress | null>(null)
  const [missions, setMissions] = useState<DailyMissionsResponse | null>(null)
  const [arenaStats, setArenaStats] = useState<ArenaStats | null>(null)
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
      apiClient.get('/api/v1/challenges/weekly').then(r => setWeeklyBoss(r.data)).catch(() => {}),
    ]).catch(() => setError(t('common.loadFailed')))
  }, [user?.id, t])

  useEffect(() => { fetchData() }, [fetchData])

  if (error) {
    return <ErrorState message={error} onRetry={() => { setError(null); fetchData() }} />
  }

  const firstName = user?.firstName || user?.username || t('home.defaultName')
  const ov = progress?.overview
  const league = arenaStats?.league ?? ''
  const leagueLabel = LEAGUE_LABELS[league] ?? ''
  const levelProgress = ov?.levelProgress ?? 0
  const primaryAction = progress?.nextActions?.[0]
  const locale = i18n.language.startsWith('ru') ? 'ru-RU' : 'en-US'
  const streakDays = ov?.currentStreakDays ?? 0

  const daysLeft = weeklyBoss?.endsAt
    ? Math.max(0, Math.floor((new Date(weeklyBoss.endsAt).getTime() - Date.now()) / 86_400_000))
    : null

  const todayLabel = new Intl.DateTimeFormat(locale, {
    weekday: 'long', day: 'numeric', month: 'long',
  }).format(new Date())

  const worldLinks = [
    { to: '/community/events', label: t('home.quick.events', 'Events'), eyebrow: t('home.quick.events.eyebrow', 'Council') },
    { to: '/community/vacancies', label: t('home.quick.vacancies', 'Vacancies'), eyebrow: t('home.quick.vacancies.eyebrow', 'Tavern') },
    { to: '/community/podcasts', label: t('home.quick.podcasts', 'Podcasts'), eyebrow: t('home.quick.podcasts.eyebrow', 'Hall of Stories') },
    { to: '/community/map', label: t('home.quick.map', 'Map'), eyebrow: t('home.quick.map.eyebrow', 'World Atlas') },
  ]

  return (
    <div className="gw">
      <PageMeta title={t('home.meta.title')} description={t('home.meta.description')} canonicalPath="/home" />

      {/* ═══════ SCENE CANVAS ═══════ */}
      <div className="gw-scene">

        {/* ── Sky ── */}
        <div className="gw-sky" />

        {/* ── Stars (dark mode only) ── */}
        <div className="gw-stars">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="gw-star"
              style={{ left: `${5 + (i * 37) % 90}%`, top: `${3 + (i * 23) % 35}%` }} />
          ))}
        </div>

        {/* ── Clouds ── */}
        <Sprite data={CLOUD_D} palette={CLOUD_P} pixel={4} className="gw-cloud gw-cloud-1" />
        <Sprite data={CLOUD_D} palette={CLOUD_P} pixel={5} className="gw-cloud gw-cloud-2" />
        <Sprite data={CLOUD_D} palette={CLOUD_P} pixel={3} className="gw-cloud gw-cloud-3" />

        {/* ── Mountains ── */}
        <div className="gw-mountains">
          <div className="gw-mtn gw-mtn-1" />
          <div className="gw-mtn gw-mtn-2" />
          <div className="gw-mtn gw-mtn-3" />
          <div className="gw-mtn gw-mtn-4" />
          <div className="gw-mtn gw-mtn-5" />
        </div>

        {/* ── Background Trees ── */}
        <Sprite data={TREE_PINE_D} palette={TREE_PINE_P} pixel={4} className="gw-tree gw-tree-bg-1" />
        <Sprite data={TREE_OAK_D} palette={TREE_OAK_P} pixel={3} className="gw-tree gw-tree-bg-2" />
        <Sprite data={TREE_PINE_D} palette={TREE_PINE_P} pixel={4} className="gw-tree gw-tree-bg-3" />
        <Sprite data={TREE_OAK_D} palette={TREE_OAK_P} pixel={3} className="gw-tree gw-tree-bg-4" />

        {/* ── Ground & Path ── */}
        <div className="gw-ground" />
        <div className="gw-path" />

        {/* ── Water Zone ── */}
        <div className="gw-water-zone" />

        {/* ── Bridge ── */}
        <div className="gw-bridge">
          <div className="gw-bridge-rail" />
          <div className="gw-bridge-plank" />
          <div className="gw-bridge-plank" />
          <div className="gw-bridge-plank" />
          <div className="gw-bridge-rail" />
        </div>

        {/* ═══════ BUILDINGS & OBJECTS ═══════ */}

        {/* Atlas Tower (world map) */}
        <Link to="/community/map" className="gw-zone gw-tower"
          title={t('home.quick.map', 'Map')}>
          <Sprite data={TOWER_D} palette={TOWER_P} pixel={5} />
          <span className="gw-label">🗺️ {t('home.quick.map.eyebrow', 'World Atlas')}</span>
        </Link>

        {/* Progress Garden */}
        <div className="gw-zone gw-garden">
          <Sprite data={gardenStage(streakDays)} palette={GARDEN_P} pixel={5} />
          {streakDays > 3 && (
            <Sprite data={gardenStage(Math.max(0, streakDays - 5))} palette={GARDEN_P} pixel={4}
              className="gw-garden-flowers" />
          )}
        </div>

        {/* Quest Board */}
        <div className="gw-zone gw-questboard">
          <Sprite data={BOARD_D} palette={BOARD_P} pixel={5} />
        </div>

        {/* Continue Journey Signpost */}
        <Link to={primaryAction?.actionUrl ?? '/practice'}
          className="gw-zone gw-signpost"
          title={t('home.hero.continue', 'Continue Journey')}>
          <Sprite data={SIGN_D} palette={SIGN_P} pixel={5} />
          <span className="gw-label gw-label-cta">
            ▶ {primaryAction
              ? t('home.hero.continue', 'Continue Journey')
              : t('home.hero.start', 'Start Training')}
          </span>
        </Link>

        {/* Tavern / Guild */}
        <Link to="/community" className="gw-zone gw-tavern"
          title={t('nav.community', 'Guild')}>
          <Sprite data={TAVERN_D} palette={TAVERN_P} pixel={5} />
          <span className="gw-label">🏠 {t('nav.community', 'Guild')}</span>
        </Link>

        {/* Weekly Boss Portal */}
        {weeklyBoss ? (
          <Link to="/practice/weekly-boss" className="gw-zone gw-portal">
            <div style={{ position: 'relative' }}>
              <div className="gw-portal-glow" />
              <Sprite data={PORTAL_D} palette={PORTAL_P} pixel={4} />
            </div>
            <span className="gw-label gw-label-boss">
              ⚔ {t('home.weeklyBoss.title', 'Weekly Boss')}
              {daysLeft !== null ? ` · ${daysLeft}d` : ''}
            </span>
          </Link>
        ) : (
          <div className="gw-zone gw-portal" style={{ cursor: 'default', opacity: 0.5 }}>
            <Sprite data={PORTAL_D} palette={PORTAL_P} pixel={4} />
          </div>
        )}

        {/* ═══════ PROPS ═══════ */}

        <div className="gw-campfire">
          <Sprite data={FIRE_D} palette={FIRE_P} pixel={4} />
        </div>

        <div className="gw-waterfall">
          <Sprite data={WATERFALL_D} palette={WATERFALL_P} pixel={4} />
        </div>

        <div className="gw-lantern gw-lantern-1">
          <Sprite data={LANTERN_D} palette={LANTERN_P} pixel={3} />
        </div>
        <div className="gw-lantern gw-lantern-2">
          <Sprite data={LANTERN_D} palette={LANTERN_P} pixel={3} />
        </div>

        <div className="gw-barrel">
          <Sprite data={BARREL_D} palette={BARREL_P} pixel={4} />
        </div>

        <Sprite data={FLOWERS_D} palette={FLOWERS_P} pixel={3} className="gw-flowers gw-flowers-1" />
        <Sprite data={FLOWERS_D} palette={FLOWERS_P} pixel={3} className="gw-flowers gw-flowers-2" />
        <Sprite data={FLOWERS_D} palette={FLOWERS_P} pixel={4} className="gw-flowers gw-flowers-3" />
        <Sprite data={FLOWERS_D} palette={FLOWERS_P} pixel={3} className="gw-flowers gw-flowers-4" />

        {/* ═══════ CHARACTERS ═══════ */}

        <div className="gw-player">
          <Sprite data={PLAYER_D} palette={PLAYER_P} pixel={4} />
        </div>

        <div className="gw-npc">
          <Sprite data={NPC_D} palette={NPC_P} pixel={3} />
        </div>

        <div className="gw-pet">
          <Sprite data={CAT_D} palette={CAT_P} pixel={4} />
        </div>

        {/* ── Foreground Trees (parallax blur) ── */}
        <Sprite data={TREE_OAK_D} palette={TREE_OAK_P} pixel={7} className="gw-tree gw-tree-fg-1" />
        <Sprite data={TREE_PINE_D} palette={TREE_PINE_P} pixel={7} className="gw-tree gw-tree-fg-2" />

        {/* ── Fireflies (dark mode) ── */}
        <div className="gw-fireflies">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={`gw-firefly gw-firefly-${i}`} />
          ))}
        </div>
      </div>

      {/* ═══════ HUD OVERLAYS ═══════ */}

      {/* ── Character HUD ── */}
      <div className="hud hud-character">
        <div className="hud-avatar">
          <PlayerFrame
            name={firstName}
            src={user?.avatarUrl || undefined}
            league={LEAGUE_FRAME_NAMES[league]}
            size="md"
          />
        </div>
        <div className="hud-stats">
          <div className="hud-name-row">
            <span className="hud-level">LV.{ov?.level ?? 0}</span>
            <span className="hud-name">{firstName}</span>
            {leagueLabel && <span className="hud-league">{leagueLabel}</span>}
          </div>
          <div className="hud-xp-row">
            <div className="hud-xp-bar">
              <div className="hud-xp-fill" style={{ width: `${levelProgress * 100}%` }} />
            </div>
            <span className="hud-xp-text">{ov?.totalXp ?? 0} XP</span>
          </div>
          <div className="hud-meta-row">
            {streakDays > 0 && (
              <span className="hud-chip hud-chip-streak">🔥 {streakDays}d</span>
            )}
            {arenaStats?.rating != null && (
              <span className="hud-chip hud-chip-rating">⚔ {arenaStats.rating}</span>
            )}
            <span className="hud-chip" style={{ opacity: 0.6, fontSize: 9, border: 'none', padding: '2px 4px' }}>
              {todayLabel}
            </span>
          </div>
        </div>
      </div>

      {/* ── Quest Scroll ── */}
      <div className="hud hud-quests">
        <div className="hud-quests-header">
          <span className="hud-quests-title">📜 {t('home.missions.title', 'Daily Quests')}</span>
          {missions && (
            <span className="hud-quests-count">
              {missions.completedCount}/{missions.missions.length}
            </span>
          )}
        </div>
        <div className="hud-quests-list">
          {missions?.missions.map(mission => (
            <Link key={mission.key} to={mission.actionUrl}
              className={`hud-quest ${mission.completed ? 'done' : ''}`}>
              <span className="hud-quest-check">{mission.completed ? '✓' : '○'}</span>
              <span className="hud-quest-title">{mission.title}</span>
              <span className="hud-quest-xp">+{mission.xpReward}</span>
            </Link>
          )) ?? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="hud-quest hud-quest-skeleton" />
            ))
          )}
        </div>
        {missions?.allComplete && (
          <div className="hud-quests-bonus">
            ✨ {t('home.missions.allDone', 'All complete! +{{xp}} XP', { xp: missions.bonusXp })}
          </div>
        )}
      </div>

      {/* ── Weekly Boss Banner ── */}
      {weeklyBoss && (
        <Link to="/practice/weekly-boss" className="hud hud-boss">
          <span className="hud-boss-icon">⚔</span>
          <div className="hud-boss-info">
            <span className="hud-boss-title">{t('home.weeklyBoss.title', 'Weekly Boss')}</span>
            <span className="hud-boss-sub">
              {weeklyBoss.myEntry
                ? t('home.weeklyBoss.yourScore', 'Your best: {{score}}/10', { score: weeklyBoss.myEntry.aiScore })
                : t('home.weeklyBoss.notAttempted', 'Not attempted yet')}
            </span>
          </div>
          {daysLeft !== null && (
            <span className="hud-boss-timer">{daysLeft}d</span>
          )}
        </Link>
      )}

      {/* ── Garden Info ── */}
      <Link to="/profile" className="hud hud-garden">
        <Sprite data={gardenStage(streakDays)} palette={GARDEN_P} pixel={3} />
        <div className="hud-garden-info">
          <span className="hud-garden-title">🌱 {t('home.garden.title', 'Progress Garden')}</span>
          <span className="hud-garden-sub">
            {streakDays > 0
              ? t('home.topLayer.streak', '{{count}} day streak', { count: streakDays })
              : t('home.garden.noStreak', 'Start a streak to grow!')}
          </span>
        </div>
      </Link>

      {/* ── World Locations Bar ── */}
      <div className="hud hud-locations">
        {worldLinks.map(({ to, label, eyebrow }) => (
          <Link key={to} to={to} className="hud-loc">
            <span className="hud-loc-eyebrow">{eyebrow}</span>
            <span className="hud-loc-label">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
