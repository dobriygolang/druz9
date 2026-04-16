import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
import { useGameEngine, type WorldObject } from '../lib/useGameEngine'
import './home-scene.css'

/* ═══════════════════════════════════════════════════════
   Additional sprites for interactive home
   ═══════════════════════════════════════════════════════ */

// ── Small House (player home) 14w × 14h ──
const HOUSE_P: Record<string, string> = {
  R: '#8B3513', r: '#A04020', W: '#D4A574', w: '#E8C99A',
  B: '#5C3A1E', D: '#4A2E14', G: '#FFD700', P: '#808080', p: '#999999',
}
const HOUSE_D = [
  '      RR      ',
  '     RRRR     ',
  '    RRrrRR    ',
  '   RRRrrRRR   ',
  '  RRRRRRRRRR  ',
  ' RRRRRRRRRRRR ',
  '  BWWGWWGWWb  ',
  '  BWWgWWgWWB  ',
  '  BWWWWWWWWB  ',
  '  BWWWDDWWWb  ',
  '  BWWWDDWWwB  ',
  '  BPPPDDPPPP  ',
  '  PPpPDDPPpP  ',
]

// ── Podcast Corner / Echo Stone 8w × 10h ──
const ECHO_P: Record<string, string> = {
  S: '#808080', s: '#666666', G: '#059669', g: '#34D399',
  P: '#C4B5FD', W: '#5C3A1E', N: '#FFD700',
}
const ECHO_D = [
  '   Ng    ',
  '  NgGN   ',
  '  gGGg   ',
  '  NgGN   ',
  '   Ng    ',
  '  SSSS   ',
  ' SSWWSS  ',
  ' SWWWWS  ',
  'SSSSSSSS ',
  'sSSSSSSs ',
]

// ── Jobs Board (contracts) 10w × 12h ──
const JOBS_P: Record<string, string> = {
  W: '#8B6914', w: '#A07828', D: '#6B4E11',
  P: '#F5E6C8', p: '#E5D0A8', N: '#CD5C5C', I: '#2C1810',
  G: '#FFD700', B: '#059669',
}
const JOBS_D = [
  ' DWWWWWWWD ',
  ' WPPPPPPPW ',
  ' WNPIPNPPW ',
  ' WPPPPIPPW ',
  ' WPIPPPNPW ',
  ' WPPNPIPPW ',
  ' WPPPPPPPW ',
  ' DWWWWWWWD ',
  '   WWWWWW  ',
  '    wW     ',
  '    WW     ',
  '    DD     ',
]

/* ═══════════════════════════════════════════════════════
   World constants
   ═══════════════════════════════════════════════════════ */

const WORLD_W = 1200
const WORLD_H = 700
const PLAYER_START_X = 300
const PLAYER_START_Y = 450

type ArenaStats = { rating?: number; league?: string; currentWinStreak?: number }

/* ═══════════════════════════════════════════════════════
   Home Page — Interactive Game Hub
   ═══════════════════════════════════════════════════════ */

export function HomePage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const sceneRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState<ProfileProgress | null>(null)
  const [missions, setMissions] = useState<DailyMissionsResponse | null>(null)
  const [arenaStats, setArenaStats] = useState<ArenaStats | null>(null)
  const [weeklyBoss, setWeeklyBoss] = useState<{
    weekKey: string; endsAt: string
    myEntry: { aiScore: number; solveTimeMs: number } | null
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // ── Data fetching ──
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

  // ── Derived data ──
  const firstName = user?.firstName || user?.username || t('home.defaultName')
  const ov = progress?.overview
  const league = arenaStats?.league ?? ''
  const leagueLabel = LEAGUE_LABELS[league] ?? ''
  const levelProgress = ov?.levelProgress ?? 0
  const primaryAction = progress?.nextActions?.[0]
  const streakDays = ov?.currentStreakDays ?? 0
  const daysLeft = weeklyBoss?.endsAt
    ? Math.max(0, Math.floor((new Date(weeklyBoss.endsAt).getTime() - Date.now()) / 86_400_000))
    : null

  // ── World objects (interactive zones) ──
  const worldObjects: WorldObject[] = useMemo(() => [
    // ── Buildings (solid — physically block movement) ──
    { id: 'home', x: 160, y: 370, w: 70, h: 65, interactRadius: 80,
      prompt: `E — ${t('nav.profile', 'Character Sheet')}`, action: '/profile', solid: true },
    { id: 'tavern', x: 760, y: 360, w: 80, h: 70, interactRadius: 90,
      prompt: `E — ${t('nav.community', 'Guild')}`, action: '/community', solid: true },
    { id: 'tower', x: 60, y: 350, w: 60, h: 90, interactRadius: 80,
      prompt: `E — ${t('home.quick.map.eyebrow', 'World Atlas')}`, action: '/community/map', solid: true },
    { id: 'portal', x: 1050, y: 370, w: 56, h: 64, interactRadius: 80,
      prompt: `E — ${t('home.weeklyBoss.title', 'Weekly Boss')}`,
      action: weeklyBoss ? 'modal:boss' : undefined, solid: true },
    // ── Interactive props (walkable — player approaches and presses E) ──
    { id: 'questboard', x: 400, y: 360, w: 60, h: 65, interactRadius: 85,
      prompt: `E — ${t('home.missions.title', 'Daily Quests')}`, action: 'modal:quests' },
    { id: 'signpost', x: 570, y: 390, w: 40, h: 70, interactRadius: 80,
      prompt: `E — ${primaryAction ? t('home.hero.continue', 'Continue Journey') : t('home.hero.start', 'Start Training')}`,
      action: primaryAction?.actionUrl ?? '/practice' },
    { id: 'garden', x: 280, y: 380, w: 50, h: 40, interactRadius: 70,
      prompt: `E — ${t('home.garden.title', 'Progress Garden')}`, action: 'modal:garden' },
    { id: 'jobs', x: 900, y: 375, w: 50, h: 60, interactRadius: 80,
      prompt: `E — ${t('home.quick.vacancies.eyebrow', 'Jobs Board')}`, action: '/community/vacancies' },
    { id: 'echo', x: 50, y: 440, w: 36, h: 40, interactRadius: 65,
      prompt: `E — ${t('home.quick.podcasts.eyebrow', 'Hall of Stories')}`, action: '/community/podcasts' },
  ], [t, primaryAction, weeklyBoss])

  // ── Game engine ──
  const { state, handleSceneClick, closeModal } = useGameEngine(
    worldObjects, WORLD_W, WORLD_H, PLAYER_START_X, PLAYER_START_Y, navigate,
  )

  // ── Viewport scaling ──
  const [scale, setScale] = useState(1)
  useEffect(() => {
    function updateScale() {
      if (!sceneRef.current) return
      const parent = sceneRef.current.parentElement
      if (!parent) return
      const sw = parent.clientWidth / WORLD_W
      const sh = parent.clientHeight / WORLD_H
      setScale(Math.min(sw, sh, 2))
    }
    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  // ── Pet follows player ──
  const petX = state.px + (state.facing === 'right' ? -28 : 52)
  const petY = state.py + 20

  if (error) return <ErrorState message={error} onRetry={() => { setError(null); fetchData() }} />

  return (
    <div className="gw" onClick={handleSceneClick}>
      <PageMeta title={t('home.meta.title')} description={t('home.meta.description')} canonicalPath="/home" />

      {/* ═══ GAME SCENE ═══ */}
      <div
        ref={sceneRef}
        className="gw-scene"
        style={{
          width: WORLD_W,
          height: WORLD_H,
          transform: `scale(${scale})`,
          left: `${((sceneRef.current?.parentElement?.clientWidth ?? WORLD_W) - WORLD_W * scale) / 2}px`,
          top: `${Math.max(0, ((sceneRef.current?.parentElement?.clientHeight ?? WORLD_H) - WORLD_H * scale) / 2)}px`,
        }}
      >
        {/* ── Environment ── */}
        <div className="gw-sky" />
        <div className="gw-stars">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="gw-star" style={{ left: `${5 + (i * 37) % 90}%`, top: `${3 + (i * 23) % 35}%` }} />
          ))}
        </div>
        <Sprite data={CLOUD_D} palette={CLOUD_P} pixel={4} className="gw-cloud gw-cloud-1" />
        <Sprite data={CLOUD_D} palette={CLOUD_P} pixel={5} className="gw-cloud gw-cloud-2" />
        <Sprite data={CLOUD_D} palette={CLOUD_P} pixel={3} className="gw-cloud gw-cloud-3" />
        <div className="gw-mountains">
          <div className="gw-mtn gw-mtn-1" /><div className="gw-mtn gw-mtn-2" />
          <div className="gw-mtn gw-mtn-3" /><div className="gw-mtn gw-mtn-4" /><div className="gw-mtn gw-mtn-5" />
        </div>

        {/* BG trees */}
        <Sprite data={TREE_PINE_D} palette={TREE_PINE_P} pixel={4} className="gw-bg-tree" style={{ left: 70, bottom: '48%' }} />
        <Sprite data={TREE_OAK_D} palette={TREE_OAK_P} pixel={3} className="gw-bg-tree" style={{ left: 580, bottom: '50%' }} />
        <Sprite data={TREE_PINE_D} palette={TREE_PINE_P} pixel={4} className="gw-bg-tree" style={{ right: 80, bottom: '47%' }} />
        <Sprite data={TREE_OAK_D} palette={TREE_OAK_P} pixel={3} className="gw-bg-tree" style={{ left: 350, bottom: '49%', opacity: .45 }} />

        <div className="gw-ground" />
        <div className="gw-path" />
        <div className="gw-water-zone" />
        <div className="gw-bridge">
          <div className="gw-bridge-rail" /><div className="gw-bridge-plank" /><div className="gw-bridge-plank" /><div className="gw-bridge-plank" /><div className="gw-bridge-rail" />
        </div>

        {/* ═══ WORLD OBJECTS ═══ */}

        {/* Atlas Tower */}
        <div className="gw-obj" style={{ left: 10, top: 260 }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <div className="gw-nameplate">{t('home.zone.atlas', 'Атлас')}</div>
            <div className={`gw-obj-base-glow${state.nearObject?.id === 'tower' ? ' active' : ''}`} />
            <Sprite data={TOWER_D} palette={TOWER_P} pixel={5} />
            {state.nearObject?.id === 'tower' && <div className="gw-obj-highlight" />}
          </div>
        </div>

        {/* Player's House */}
        <div className="gw-obj" style={{ left: 95, top: 300 }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <div className="gw-nameplate">{t('home.zone.camp', 'Лагерь')}</div>
            <div className={`gw-obj-base-glow${state.nearObject?.id === 'home' ? ' active' : ''}`} />
            <Sprite data={HOUSE_D} palette={HOUSE_P} pixel={5} />
            {state.nearObject?.id === 'home' && <div className="gw-obj-highlight" />}
          </div>
        </div>

        {/* Fence near house */}
        <div className="gw-fence-post" style={{ left: 200, top: 354, height: 30, zIndex: 15 }} />
        <div className="gw-fence-post" style={{ left: 215, top: 354, height: 30, zIndex: 15 }} />
        <div className="gw-fence-post" style={{ left: 230, top: 354, height: 30, zIndex: 15 }} />
        <div className="gw-fence-h" style={{ left: 200, top: 362, width: 36, zIndex: 15 }} />
        <div className="gw-fence-h" style={{ left: 200, top: 372, width: 36, zIndex: 15 }} />

        {/* Echo Stone (Podcasts) */}
        <div className="gw-obj" style={{ left: 18, top: 412 }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <div className="gw-nameplate">{t('home.zone.echo', 'Эхо-камень')}</div>
            <div className={`gw-obj-base-glow${state.nearObject?.id === 'echo' ? ' active' : ''}`} />
            <Sprite data={ECHO_D} palette={ECHO_P} pixel={4} />
            {state.nearObject?.id === 'echo' && <div className="gw-obj-highlight" />}
          </div>
        </div>

        {/* Progress Garden */}
        <div className="gw-obj" style={{ left: 240, top: 355 }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <div className="gw-nameplate">{t('home.zone.garden', 'Сад прогресса')}</div>
            <div className={`gw-obj-base-glow${state.nearObject?.id === 'garden' ? ' active' : ''}`} />
            <Sprite data={gardenStage(streakDays)} palette={GARDEN_P} pixel={5} />
            {streakDays > 3 && <Sprite data={gardenStage(Math.max(0, streakDays - 5))} palette={GARDEN_P} pixel={4} style={{ marginLeft: 8 }} />}
            {state.nearObject?.id === 'garden' && <div className="gw-obj-highlight" />}
          </div>
        </div>

        {/* Quest Board */}
        <div className="gw-obj" style={{ left: 365, top: 305 }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <div className="gw-nameplate">{t('home.zone.quests', 'Доска квестов')}</div>
            <div className={`gw-obj-base-glow${state.nearObject?.id === 'questboard' ? ' active' : ''}`} />
            <Sprite data={BOARD_D} palette={BOARD_P} pixel={5} />
            {state.nearObject?.id === 'questboard' && <div className="gw-obj-highlight" />}
          </div>
        </div>

        {/* Signpost (Continue Journey) */}
        <div className="gw-obj" style={{ left: 545, top: 320 }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <div className="gw-nameplate">{primaryAction ? t('home.zone.journey', 'В путь') : t('home.zone.training', 'Полигон')}</div>
            <div className={`gw-obj-base-glow${state.nearObject?.id === 'signpost' ? ' active' : ''}`} />
            <Sprite data={SIGN_D} palette={SIGN_P} pixel={5} />
            {state.nearObject?.id === 'signpost' && <div className="gw-obj-highlight" />}
          </div>
        </div>

        {/* Tavern / Guild */}
        <div className="gw-obj" style={{ left: 690, top: 290 }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <div className="gw-nameplate">{t('home.zone.guild', 'Гильдия')}</div>
            <div className={`gw-obj-base-glow${state.nearObject?.id === 'tavern' ? ' active' : ''}`} />
            <Sprite data={TAVERN_D} palette={TAVERN_P} pixel={5} />
            {state.nearObject?.id === 'tavern' && <div className="gw-obj-highlight" />}
          </div>
        </div>

        {/* Jobs Board */}
        <div className="gw-obj" style={{ left: 860, top: 312 }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <div className="gw-nameplate">{t('home.zone.jobs', 'Доска заданий')}</div>
            <div className={`gw-obj-base-glow${state.nearObject?.id === 'jobs' ? ' active' : ''}`} />
            <Sprite data={JOBS_D} palette={JOBS_P} pixel={5} />
            {state.nearObject?.id === 'jobs' && <div className="gw-obj-highlight" />}
          </div>
        </div>

        {/* Weekly Boss Portal */}
        <div className="gw-obj" style={{ left: 1010, top: 305 }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <div className="gw-nameplate">{t('home.zone.boss', 'Врата босса')}</div>
            <div className="gw-glow-portal" />
            <div className={`gw-obj-base-glow${state.nearObject?.id === 'portal' ? ' active' : ''}`} />
            <Sprite data={PORTAL_D} palette={PORTAL_P} pixel={4} />
            {state.nearObject?.id === 'portal' && <div className="gw-obj-highlight" />}
          </div>
        </div>

        {/* ═══ PROPS ═══ */}

        {/* Campfire */}
        <div className="gw-obj" style={{ left: 478, top: 408 }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <div className="gw-glow-fire" />
            <Sprite data={FIRE_D} palette={FIRE_P} pixel={4} />
          </div>
        </div>

        {/* Waterfall */}
        <div className="gw-obj gw-waterfall" style={{ right: 30, top: 300 }}>
          <Sprite data={WATERFALL_D} palette={WATERFALL_P} pixel={4} />
        </div>

        {/* Lanterns — more spread out */}
        {[
          { l: 680, t: 338 }, { l: 852, t: 333 }, { l: 528, t: 308 },
          { l: 340, t: 310 }, { l: 175, t: 305 }, { l: 980, t: 320 },
        ].map((p, i) => (
          <div key={i} className="gw-obj" style={{ left: p.l, top: p.t }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <div className="gw-glow-lantern" />
              <Sprite data={LANTERN_D} palette={LANTERN_P} pixel={3} />
            </div>
          </div>
        ))}

        {/* Barrels — near tavern */}
        <div className="gw-obj" style={{ left: 800, top: 395 }}>
          <Sprite data={BARREL_D} palette={BARREL_P} pixel={4} />
        </div>
        <div className="gw-obj" style={{ left: 822, top: 405 }}>
          <Sprite data={BARREL_D} palette={BARREL_P} pixel={3} />
        </div>
        <div className="gw-obj" style={{ left: 840, top: 398 }}>
          <Sprite data={BARREL_D} palette={BARREL_P} pixel={4} />
        </div>

        {/* Crates near tavern */}
        <div className="gw-crate" style={{ left: 670, top: 390, width: 22, height: 20, zIndex: 21 }} />
        <div className="gw-crate" style={{ left: 694, top: 396, width: 16, height: 15, zIndex: 21 }} />

        {/* Stones scattered mid-field */}
        <div className="gw-stone" style={{ left: 452, top: 445, width: 16, height: 11, zIndex: 15 }} />
        <div className="gw-stone" style={{ left: 464, top: 452, width: 10, height: 8, zIndex: 15 }} />
        <div className="gw-stone" style={{ left: 320, top: 440, width: 13, height: 9, zIndex: 15 }} />
        <div className="gw-stone" style={{ left: 600, top: 448, width: 12, height: 8, zIndex: 15 }} />
        <div className="gw-stone" style={{ left: 1000, top: 440, width: 15, height: 10, zIndex: 15 }} />

        {/* Wall torches near house */}
        <div className="gw-obj" style={{ left: 168, top: 326, zIndex: 22 }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <div className="gw-torch" style={{ height: 10, width: 5 }} />
            <div className="gw-torch-flame" />
            <div className="gw-glow-fire" style={{ opacity: 0.5 }} />
          </div>
        </div>
        {/* Wall torch near tavern */}
        <div className="gw-obj" style={{ left: 766, top: 318, zIndex: 22 }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <div className="gw-torch" style={{ height: 10, width: 5 }} />
            <div className="gw-torch-flame" />
            <div className="gw-glow-fire" style={{ opacity: 0.5 }} />
          </div>
        </div>

        {/* Flowers */}
        <Sprite data={FLOWERS_D} palette={FLOWERS_P} pixel={3} className="gw-flowers" style={{ left: 180, bottom: 100 }} />
        <Sprite data={FLOWERS_D} palette={FLOWERS_P} pixel={3} className="gw-flowers" style={{ left: 620, bottom: 90 }} />
        <Sprite data={FLOWERS_D} palette={FLOWERS_P} pixel={4} className="gw-flowers" style={{ left: 950, bottom: 110 }} />
        <Sprite data={FLOWERS_D} palette={FLOWERS_P} pixel={3} className="gw-flowers" style={{ left: 420, bottom: 80 }} />
        <Sprite data={FLOWERS_D} palette={FLOWERS_P} pixel={3} className="gw-flowers" style={{ left: 760, bottom: 95 }} />
        <Sprite data={FLOWERS_D} palette={FLOWERS_P} pixel={2} className="gw-flowers" style={{ left: 130, bottom: 85 }} />
        <Sprite data={FLOWERS_D} palette={FLOWERS_P} pixel={2} className="gw-flowers" style={{ left: 500, bottom: 75 }} />

        {/* ═══ NPCs ═══ */}
        <div className="gw-obj" style={{ left: 720, top: 398, zIndex: 25 }}>
          <Sprite data={NPC_D} palette={NPC_P} pixel={3} />
        </div>
        <div className="gw-obj" style={{ left: 748, top: 404, zIndex: 24 }}>
          <Sprite data={NPC_D} palette={NPC_P} pixel={3} style={{ transform: 'scaleX(-1)' }} />
        </div>
        <div className="gw-obj" style={{ left: 378, top: 408, zIndex: 25 }}>
          <Sprite data={NPC_D} palette={NPC_P} pixel={3} style={{ transform: 'scaleX(-1)' }} />
        </div>

        {/* ═══ PLAYER CHARACTER ═══ */}
        <div
          className={`gw-player ${state.walking ? 'walking' : ''} ${state.facing === 'left' ? 'facing-left' : ''}`}
          style={{ left: state.px, top: state.py }}
        >
          <Sprite data={PLAYER_D} palette={PLAYER_P} pixel={4} className="gw-player-sprite" />
        </div>

        {/* ═══ PET ═══ */}
        <div className="gw-pet" style={{ left: petX, top: petY }}>
          <Sprite data={CAT_D} palette={CAT_P} pixel={3} style={state.facing === 'left' ? { transform: 'scaleX(-1)' } : undefined} />
        </div>

        {/* ═══ INTERACTION PROMPT ═══ */}
        {state.nearObject && !state.interacting && (
          <div className="gw-prompt" style={{
            left: state.nearObject.x - 30,
            top: state.nearObject.y - state.nearObject.h / 2 - 60,
          }}>
            <div className="gw-prompt-key">E</div>
            <div className="gw-prompt-text">{state.nearObject.prompt}</div>
          </div>
        )}

        {/* FG trees */}
        <Sprite data={TREE_OAK_D} palette={TREE_OAK_P} pixel={7} className="gw-fg-tree" style={{ left: -10, bottom: 60 }} />
        <Sprite data={TREE_PINE_D} palette={TREE_PINE_P} pixel={7} className="gw-fg-tree" style={{ right: -15, bottom: 80 }} />

        {/* Fireflies */}
        <div className="gw-fireflies">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={`gw-firefly gw-ff-${i}`} />
          ))}
        </div>
      </div>

      {/* ═══ GAME MODALS ═══ */}

      {/* Quest Board Modal */}
      {state.interacting === 'quests' && (
        <div className="gw-modal-backdrop" onClick={closeModal}>
          <div className="gw-modal" onClick={e => e.stopPropagation()}>
            <div className="gw-modal-header">
              <div className="gw-modal-title">📜 {t('home.missions.title', 'Daily Quests')}</div>
            </div>
            <div className="gw-modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {missions?.missions.map(m => (
                  <Link key={m.key} to={m.actionUrl} onClick={closeModal}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                      textDecoration: 'none', color: 'inherit', opacity: m.completed ? .5 : 1 }}>
                    <span style={{ width: 20, textAlign: 'center', fontSize: 14 }}>
                      {m.completed ? '✅' : '⬜'}
                    </span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 500,
                      textDecoration: m.completed ? 'line-through' : 'none',
                      color: 'var(--text-primary, #2C1810)' }}>
                      {m.title}
                    </span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                      fontWeight: 700, color: '#15803D' }}>
                      +{m.xpReward} XP
                    </span>
                  </Link>
                )) ?? <div style={{ color: '#8B7355', fontSize: 12 }}>{t('common.loading', 'Loading...')}</div>}
              </div>
              {missions?.allComplete && (
                <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(5,150,105,.1)',
                  borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#059669', textAlign: 'center' }}>
                  ✨ {t('home.missions.allDone', 'All complete! +{{xp}} XP', { xp: missions.bonusXp })}
                </div>
              )}
            </div>
            <div className="gw-modal-footer">
              <button className="gw-modal-btn" onClick={closeModal}>
                {t('common.close', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Boss Modal */}
      {state.interacting === 'boss' && weeklyBoss && (
        <div className="gw-modal-backdrop" onClick={closeModal}>
          <div className="gw-modal" onClick={e => e.stopPropagation()}>
            <div className="gw-modal-header">
              <div className="gw-modal-title">⚔ {t('home.weeklyBoss.title', 'Weekly Boss')}</div>
            </div>
            <div className="gw-modal-body">
              <p style={{ fontSize: 13, color: 'var(--text-primary, #2C1810)', marginBottom: 8 }}>
                {weeklyBoss.myEntry
                  ? t('home.weeklyBoss.yourScore', 'Your best: {{score}}/10', { score: weeklyBoss.myEntry.aiScore })
                  : t('home.weeklyBoss.notAttempted', 'Not attempted yet — take on the challenge!')}
              </p>
              {daysLeft !== null && (
                <p style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: '#D97706', fontWeight: 700 }}>
                  ⏰ {daysLeft} {t('home.weeklyBoss.daysLeft', 'days left')}
                </p>
              )}
            </div>
            <div className="gw-modal-footer">
              <button className="gw-modal-btn" onClick={closeModal}>
                {t('common.later', 'Later')}
              </button>
              <Link to="/practice/weekly-boss" className="gw-modal-btn gw-modal-btn-boss" onClick={closeModal}>
                {t('weeklyBoss.startChallenge', 'Enter')} →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Garden Modal */}
      {state.interacting === 'garden' && (
        <div className="gw-modal-backdrop" onClick={closeModal}>
          <div className="gw-modal" onClick={e => e.stopPropagation()}>
            <div className="gw-modal-header">
              <div className="gw-modal-title">🌱 {t('home.garden.title', 'Progress Garden')}</div>
            </div>
            <div className="gw-modal-body" style={{ textAlign: 'center' }}>
              <div style={{ margin: '12px auto' }}>
                <Sprite data={gardenStage(streakDays)} palette={GARDEN_P} pixel={6} />
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-primary, #2C1810)', marginBottom: 6 }}>
                {streakDays > 0
                  ? t('home.topLayer.streak', '{{count}} day streak', { count: streakDays })
                  : t('home.garden.noStreak', 'Start a streak to grow!')}
              </p>
              <p style={{ fontSize: 11, color: '#8B7355' }}>
                XP: {ov?.totalXp ?? 0} · LV.{ov?.level ?? 0}
              </p>
            </div>
            <div className="gw-modal-footer">
              <button className="gw-modal-btn" onClick={closeModal}>
                {t('common.close', 'Close')}
              </button>
              <Link to="/profile" className="gw-modal-btn gw-modal-btn-primary" onClick={closeModal}>
                {t('nav.profile', 'Character Sheet')} →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ═══ HUD OVERLAYS ═══ */}

      {/* Character HUD */}
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
          <div className="hud-xp-row">
            <div className="hud-xp-bar">
              <div className="hud-xp-fill" style={{ width: `${levelProgress * 100}%` }} />
            </div>
            <span className="hud-xp-text">{ov?.totalXp ?? 0} XP</span>
          </div>
          <div className="hud-meta-row">
            {streakDays > 0 && <span className="hud-chip hud-chip-streak">🔥 {streakDays}d</span>}
            {arenaStats?.rating != null && <span className="hud-chip hud-chip-rating">⚔ {arenaStats.rating}</span>}
          </div>
        </div>
      </div>

      {/* Controls hint */}
      <div className="hud hud-controls">
        WASD / ← → ↑ ↓ — move<br />
        E — interact<br />
        Click — walk / interact
      </div>
    </div>
  )
}
