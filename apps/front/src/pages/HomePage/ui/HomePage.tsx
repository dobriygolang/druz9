/**
 * HomePage — DRUZ9 home hub.
 *
 * Thin React shell: owns data fetching + modal dispatch; delegates the
 * walkable world to the world/ module (mini-engine + data-driven scene +
 * declarative renderer). No world state lives in JSX — to add a building,
 * NPC, hazard, or interaction, edit world/scene.ts, not this file.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/app/providers/AuthProvider'
import { authApi } from '@/features/Auth/api/authApi'
import { missionApi } from '@/features/Mission/api/missionApi'
import { arenaApi } from '@/features/Arena/api/arenaApi'
import { apiClient } from '@/shared/api/base'
import { PlayerFrame } from '@/shared/ui/PlayerFrame'
import { ErrorState } from '@/shared/ui/ErrorState'
import { PageMeta } from '@/shared/ui/PageMeta'
import { LEAGUE_LABELS, LEAGUE_FRAME_NAMES } from '@/shared/lib/league'
import type { ProfileProgress } from '@/entities/User/model/types'
import type { DailyMissionsResponse } from '@/features/Mission/model/types'

import { useWorld } from '../lib/world/useWorld'
import { buildScene, WORLD_W, WORLD_H, type SceneLabels } from '../lib/world/scene'
import { useWallet } from '../lib/world/wallet'
import { WorldRenderer } from './WorldRenderer'
import {
  QuestsModal, BossModal, GardenModal, ShopModal, AcademyModal, TrainingModal, RestModal,
} from './modals/HomeModals'
import './home-scene.css'

type ArenaStats = { rating?: number; league?: string; currentWinStreak?: number }
type WeeklyBoss = {
  weekKey: string
  endsAt: string
  myEntry: { aiScore: number; solveTimeMs: number } | null
} | null

export function HomePage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const viewportRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState<ProfileProgress | null>(null)
  const [missions, setMissions] = useState<DailyMissionsResponse | null>(null)
  const [arenaStats, setArenaStats] = useState<ArenaStats | null>(null)
  const [weeklyBoss, setWeeklyBoss] = useState<WeeklyBoss>(null)
  const [error, setError] = useState<string | null>(null)

  const wallet = useWallet()

  // ── Data fetching ──
  const tRef = useRef(t)
  tRef.current = t
  const fetchData = useCallback(() => {
    if (!user?.id) return
    setError(null)
    Promise.all([
      authApi.getProfileProgress(user.id).then(p => setProgress(p)),
      missionApi.getDailyMissions().then(m => setMissions(m)).catch(() => {}),
      arenaApi.getPlayerStats(user.id).then(s => { if (s) setArenaStats(s) }),
      apiClient.get('/api/v1/challenges/weekly').then(r => setWeeklyBoss(r.data)).catch(() => {}),
    ]).catch(() => setError(tRef.current('common.loadFailed')))
  }, [user?.id])
  useEffect(() => { fetchData() }, [fetchData])

  // ── Derived ──
  const firstName = user?.firstName || user?.username || t('home.defaultName')
  const ov = progress?.overview
  const league = arenaStats?.league ?? ''
  const leagueLabel = LEAGUE_LABELS[league] ?? ''
  const levelProgress = ov?.levelProgress ?? 0
  const streakDays = ov?.currentStreakDays ?? 0
  const primaryAction = progress?.nextActions?.[0]
  const daysLeft = weeklyBoss?.endsAt
    ? Math.max(0, Math.floor((new Date(weeklyBoss.endsAt).getTime() - Date.now()) / 86_400_000))
    : null

  // ── Scene ──
  const labels: SceneLabels = useMemo(() => ({
    home:     t('home.zone.camp', 'Camp'),       homePrompt:     `E — ${t('nav.profile', 'Character Sheet')}`,
    guild:    t('home.zone.guild', 'Guild'),     guildPrompt:    `E — ${t('nav.community', 'Guild Hall')}`,
    academy:  t('home.zone.academy', 'Academy'), academyPrompt:  `E — ${t('home.zone.academy', 'Academy')}`,
    shop:     t('home.zone.shop', 'Market'),     shopPrompt:     `E — ${t('home.zone.shop', 'Merchant')}`,
    board:    t('home.zone.quests', 'Quests'),   boardPrompt:    `E — ${t('home.missions.title', 'Daily Quests')}`,
    sign:     primaryAction
      ? t('home.zone.journey', 'Continue')
      : t('home.zone.training', 'Train'),
    signPrompt: `E — ${primaryAction ? t('home.hero.continue', 'Continue Journey') : t('home.hero.start', 'Start Training')}`,
    garden:   t('home.zone.garden', 'Garden'),   gardenPrompt:   `E — ${t('home.garden.title', 'Progress Garden')}`,
    training: t('home.zone.training', 'Training'), trainingPrompt: `E — ${t('home.zone.training', 'Training Ground')}`,
    altar:    t('home.zone.altar', 'Altar'),     altarPrompt:    `E — ${t('home.zone.altar', 'Altar')}`,
    portal:   t('home.zone.boss', 'Boss Portal'), portalPrompt:   `E — ${t('home.weeklyBoss.title', 'Weekly Boss')}`,
    atlas:    t('home.zone.atlas', 'Atlas'),     atlasPrompt:    `E — ${t('home.quick.map.eyebrow', 'World Atlas')}`,
    fire:     t('home.zone.fire', 'Campfire'),   firePrompt:     `E — ${t('home.zone.rest', 'Rest')}`,
  }), [t, primaryAction])

  const scene = useMemo(() => buildScene(labels, primaryAction?.actionUrl), [labels, primaryAction])

  // ── Engine ──
  const { state, handleSceneClick, closeModal } = useWorld({
    scene,
    onRoute: path => navigate(path),
  })

  // ── Viewport scaling — fit WORLD_W × WORLD_H into parent ──
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  useEffect(() => {
    function update() {
      const el = viewportRef.current
      if (!el) return
      const sw = el.clientWidth / WORLD_W
      const sh = el.clientHeight / WORLD_H
      const s = Math.min(sw, sh, 1.4)
      setScale(s)
      setOffset({
        x: Math.max(0, (el.clientWidth - WORLD_W * s) / 2),
        y: Math.max(0, (el.clientHeight - WORLD_H * s) / 2),
      })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  if (error) return <ErrorState message={error} onRetry={() => { setError(null); fetchData() }} />

  const { player, openModal: activeModal } = state
  const weeklyBossReady = !!weeklyBoss

  return (
    <div className="gw" ref={viewportRef}>
      <PageMeta title={t('home.meta.title')} description={t('home.meta.description')} canonicalPath="/home" />

      {/* ─── World (scaled) ─── */}
      <div
        className="gw-scene"
        onClick={e => handleSceneClick(e, WORLD_W, WORLD_H)}
        style={{
          width: WORLD_W, height: WORLD_H,
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: '0 0',
        }}
      >
        <WorldRenderer scene={scene} state={state} streakDays={streakDays} weeklyBossReady={weeklyBossReady} />
      </div>

      {/* ─── HUD ─── */}
      <div className="hud hud-character">
        <div style={{ flexShrink: 0 }}>
          <PlayerFrame name={firstName} src={user?.avatarUrl || undefined} league={LEAGUE_FRAME_NAMES[league]} size="md" />
        </div>
        <div className="hud-stats">
          <div className="hud-name-row">
            <span className="hud-level">LV.{ov?.level ?? 0}</span>
            <span className="hud-name">{firstName}</span>
            {leagueLabel && <span className="hud-league">{leagueLabel}</span>}
          </div>
          <div className="hud-bar-row">
            <span className="hud-bar-label">XP</span>
            <div className="hud-bar hud-bar-xp"><div className="hud-bar-fill" style={{ width: `${levelProgress * 100}%` }} /></div>
            <span className="hud-bar-val">{ov?.totalXp ?? 0}</span>
          </div>
          <div className="hud-bar-row">
            <span className="hud-bar-label">HP</span>
            <div className="hud-bar hud-bar-hp"><div className="hud-bar-fill" style={{ width: `${(player.hp / player.maxHp) * 100}%` }} /></div>
            <span className="hud-bar-val">{Math.round(player.hp)}</span>
          </div>
          <div className="hud-meta-row">
            {streakDays > 0 && <span className="hud-chip hud-chip-streak">🔥 {streakDays}d</span>}
            {arenaStats?.rating != null && <span className="hud-chip hud-chip-rating">⚔ {arenaStats.rating}</span>}
            <span className="hud-chip hud-chip-embers">🔥 {wallet.state.embers} embers</span>
          </div>
        </div>
      </div>

      {player.inHazard && (
        <div className="hud hud-hazard">⚠ Dangerous waters — get back on land!</div>
      )}
      {player.respawning && (
        <div className="hud hud-respawn">You fell. Returning to camp…</div>
      )}

      <div className="hud hud-controls">
        WASD / ← → ↑ ↓ — move<br />
        E / Enter — interact<br />
        Click — walk to / interact
      </div>

      {/* ─── Modals ─── */}
      {activeModal === 'quests'   && <QuestsModal   missions={missions}   onClose={closeModal} />}
      {activeModal === 'boss'     && <BossModal     weeklyBoss={weeklyBoss} daysLeft={daysLeft} onClose={closeModal} />}
      {activeModal === 'garden'   && <GardenModal   streakDays={streakDays} totalXp={ov?.totalXp ?? 0} level={ov?.level ?? 0} onClose={closeModal} />}
      {activeModal === 'shop'     && <ShopModal     wallet={wallet.state} onBuy={wallet.buy} onClose={closeModal} />}
      {activeModal === 'academy'  && <AcademyModal  onClose={closeModal} />}
      {activeModal === 'training' && <TrainingModal onClose={closeModal} />}
      {activeModal === 'rest'     && <RestModal     onClose={closeModal} onRest={() => wallet.reward(5)} energy={player.energy} />}
    </div>
  )
}
