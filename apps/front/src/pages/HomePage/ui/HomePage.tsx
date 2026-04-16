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
import type { ProfileProgress } from '@/entities/User/model/types'
import type { DailyMissionsResponse } from '@/features/Mission/model/types'
import { LEAGUE_LABELS, LEAGUE_FRAME_NAMES } from '@/shared/lib/league'
import './home-scene.css'

/* ═══════════════════════════════════════════════════════════════
   Pixel Sprite Renderer
   ═══════════════════════════════════════════════════════════════ */

function Sprite({
  data, palette, pixel = 4, className, style,
}: {
  data: string[]; palette: Record<string, string>; pixel?: number
  className?: string; style?: React.CSSProperties
}) {
  const w = Math.max(...data.map(r => r.length))
  const h = data.length
  const rects: React.ReactNode[] = []
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < data[y].length; x++) {
      const c = palette[data[y][x]]
      if (c) rects.push(
        <rect key={`${x}.${y}`} x={x * pixel} y={y * pixel}
          width={pixel} height={pixel} fill={c} />,
      )
    }
  }
  return (
    <svg width={w * pixel} height={h * pixel}
      viewBox={`0 0 ${w * pixel} ${h * pixel}`}
      className={className} style={{ imageRendering: 'pixelated', ...style }}>
      {rects}
    </svg>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Sprite Data — palettes & pixel rows
   ═══════════════════════════════════════════════════════════════ */

// ── Tavern (16w × 14h) ──
const TP: Record<string, string> = {
  R: '#8B3513', r: '#A04020', q: '#B85030',
  W: '#D4A574', w: '#E8C99A', B: '#5C3A1E', b: '#7A5833',
  D: '#4A2E14', d: '#3C2410', G: '#FFD700', g: '#FFC000',
  P: '#808080', p: '#999999', C: '#5A5A6A', c: '#707080',
}
const TD = [
  '       CC       ',
  '       Cc       ',
  '    RRRRRRRR    ',
  '   RRRRqrRRRR   ',
  '  RRRRRqrRRRRR  ',
  ' RRRRRRRRRRRRRR ',
  'RRRRRRRRRRRRRRRq',
  '  BWWGWWWWGWWb  ',
  '  BWWgWWWWgWWB  ',
  '  BWWWWWWWWWWB  ',
  '  BWGWWddWWGWb  ',
  '  BWgWWDDWWgWB  ',
  '  BPPPPDDPPPPP  ',
  '  PPpPPDDPPpPPp ',
]

// ── Tower (12w × 19h) ──
const XP: Record<string, string> = {
  S: '#808888', s: '#6A7278', W: '#A0A8B0', w: '#B0B8C0',
  G: '#4499CC', g: '#66BBEE', F: '#FFD700', f: '#FFA500',
  D: '#5C3A1E', M: '#3388BB', m: '#5599CC',
}
const XD = [
  '     Ff     ',
  '    FmmF    ',
  '    FMMF    ',
  '     Ff     ',
  '    SssS    ',
  '   SSWWSS   ',
  '   SWgWWS   ',
  '   SSWWSS   ',
  '   SSWWSS   ',
  '   SWgWWS   ',
  '   SSWWSS   ',
  '   SSWWSS   ',
  '   SWgWWS   ',
  '   SSWWSS   ',
  '  SSWDWSS   ',
  '  SSSDsSS   ',
  ' SSSSSSSSSS ',
  'SSSSSSSSSSSS',
]

// ── Player Character (12w × 16h) ──
const PP: Record<string, string> = {
  H: '#5C3A1E', h: '#7A5033', S: '#F4C99B', s: '#E8B88C',
  E: '#1E1E1E', C: '#E8A87C', A: '#059669', a: '#047857',
  T: '#34D399', t: '#2AB880', P: '#5B4A3F',
  B: '#3D2E24', b: '#2E2018',
}
const PD = [
  '    HHH     ',
  '   HHHHH    ',
  '   HhHhH    ',
  '   SSSSS    ',
  '   SESESS   ',
  '   SSCCSS   ',
  '    SSS     ',
  '   aTTTa    ',
  '  saTTTas   ',
  '   TTTTT    ',
  '   aTTTa    ',
  '    PPP     ',
  '   PP PP    ',
  '   PP PP    ',
  '   BB BB    ',
  '   Bb Bb    ',
]

// ── NPC Merchant (12w × 16h) ──
const NP: Record<string, string> = {
  H: '#D97706', h: '#B45309', S: '#F4C99B', s: '#E8B88C',
  E: '#1E1E1E', C: '#E8A87C', R: '#8B3513', r: '#A04020',
  T: '#C4A46C', t: '#B08C4A', P: '#5B4A3F',
  B: '#3D2E24', b: '#2E2018',
}
const ND = [
  '   HhHHH    ',
  '   HHHHH    ',
  '   HhHhH    ',
  '   SSSSS    ',
  '   SESESS   ',
  '   SSCCSS   ',
  '    SSS     ',
  '   RTTTTR   ',
  '  rRTTTRr   ',
  '   RTTTTR   ',
  '   rTTTr    ',
  '    PPP     ',
  '   PP PP    ',
  '   PP PP    ',
  '   BB BB    ',
  '   Bb Bb    ',
]

// ── Companion Cat (8w × 6h) ──
const CP: Record<string, string> = {
  O: '#FF8C00', o: '#E67E00', E: '#1E1E1E', N: '#FFB366', T: '#CC7000',
}
const CD = [
  ' O    O ',
  ' OO  OO ',
  ' OEOOEO ',
  'OONNNOOO',
  ' OOOOOOT',
  '  OOOO  ',
]

// ── Oak Tree (10w × 15h) ──
const KP: Record<string, string> = {
  L: '#2D5A27', l: '#3A7A32', k: '#4E9A44', K: '#60B855',
  T: '#6B4E28', t: '#5A3E1E',
}
const KD = [
  '   llll   ',
  '  lLlLll  ',
  ' llKlkLll ',
  ' lLlklLLl ',
  'llkKlLlkll',
  'lLllklLlLl',
  ' llLKlLll ',
  '  lllLll  ',
  '   llll   ',
  '    TT    ',
  '    TT    ',
  '    TT    ',
  '    Tt    ',
  '   tTTt   ',
  '  ttTTtt  ',
]

// ── Pine Tree (8w × 15h) ──
const IP: Record<string, string> = {
  L: '#1A4D2E', l: '#2D6A3F', k: '#3D8A4F',
  T: '#5A3E1E', t: '#4A3018',
}
const ID = [
  '   lL   ',
  '  llLl  ',
  '  lkLl  ',
  ' lllLll ',
  '  llLl  ',
  ' llLkll ',
  ' lkLlkl ',
  'lllLlkll',
  '  lLkl  ',
  ' llLkll ',
  'lkLlklkl',
  '   TT   ',
  '   Tt   ',
  '   TT   ',
  '  tTTt  ',
]

// ── Quest Board (12w × 13h) ──
const BP: Record<string, string> = {
  W: '#8B6914', w: '#A07828', D: '#6B4E11',
  P: '#F5E6C8', p: '#E5D0A8', N: '#CD5C5C', I: '#2C1810',
}
const BD = [
  '  DWWWWWWD  ',
  '  WPPPPPW   ',
  '  WNPIPNW   ',
  '  WPPPPPW   ',
  '  WPIPPIW   ',
  '  WPPPPPW   ',
  '  WPIPpPW   ',
  '  WPPPPPW   ',
  '  DWWWWWWD  ',
  '   WWWWWW   ',
  '    wW      ',
  '    WW      ',
  '    DD      ',
]

// ── Signpost (8w × 14h) ──
const SP: Record<string, string> = {
  W: '#A07828', w: '#8B6914', D: '#6B4E11',
  A: '#059669', a: '#047857',
}
const SD = [
  ' AAAAAA ',
  ' AaAAAA ',
  ' AAAAAA ',
  '   WW   ',
  '  DDDD  ',
  '  DWWD  ',
  '   WW   ',
  '   wW   ',
  '   WW   ',
  '   Ww   ',
  '   WW   ',
  '   wW   ',
  '  DWWD  ',
  ' DDDDDD ',
]

// ── Boss Portal (14w × 16h) ──
const OP: Record<string, string> = {
  S: '#808080', s: '#666666', G: '#8B5CF6', g: '#6D28D9',
  P: '#C4B5FD', p: '#A78BFA', F: '#DDD6FE',
  K: '#555555', k: '#444444',
}
const OD = [
  '    PPPP      ',
  '  PPGggGPP    ',
  ' PGg    gGP   ',
  ' Pg  FF  gP   ',
  'SG  FPPF  GS  ',
  'Sg   PP   gS  ',
  'SG        GS  ',
  'Sg        gS  ',
  'SG        GS  ',
  'SG  FPPF  GS  ',
  ' Sg  FF  gS   ',
  ' SGg    gGS   ',
  '  SSGggGSS    ',
  '    SSSS      ',
  ' KKKKKKKKKK   ',
  'kKKKKKKKKKKk  ',
]

// ── Campfire (8w × 8h) ──
const FP: Record<string, string> = {
  S: '#808080', s: '#666666', R: '#DD5500', r: '#FF8800',
  Y: '#FFAA33', y: '#FFD700', G: '#555555',
}
const FD = [
  '   Yy   ',
  '  yYRy  ',
  '  RyrR  ',
  ' RrYrR  ',
  ' yRYRr  ',
  '  RrR   ',
  ' SGSGS  ',
  'sSSSSSSs',
]

// ── Waterfall (6w × 16h) ──
const WP: Record<string, string> = {
  S: '#808080', s: '#666666', W: '#4499CC', w: '#66BBEE',
  F: '#AADDEE', f: '#88CCDD',
}
const WD = [
  'SSSSS ',
  'SwwwS ',
  ' WwW  ',
  ' wWFw ',
  ' WwwW ',
  ' wWww ',
  ' WFwW ',
  ' wWww ',
  ' WwFW ',
  ' wWww ',
  ' WwwW ',
  'FwWwwF',
  'FfWwfF',
  'FFfwFF',
  ' FFFF ',
  '  FF  ',
]

// ── Lantern (4w × 8h) ──
const LP: Record<string, string> = {
  W: '#5C3A1E', G: '#FFD700', g: '#FFC000', M: '#808080', F: '#FFAA33',
}
const LD = [
  ' MM ',
  ' MW ',
  'WGGW',
  'WgFW',
  'WGGW',
  ' WW ',
  ' WW ',
  ' WW ',
]

// ── Flowers (8w × 4h) ──
const RP: Record<string, string> = {
  R: '#E74C3C', r: '#FF6B6B', Y: '#FFD700', y: '#FBBF24',
  P: '#D946EF', p: '#F0ABFC', G: '#3A7A32', g: '#4E9A44',
}
const RD = [
  ' R  Yp  ',
  'rRg yPg ',
  ' gG gG  ',
  ' g   g  ',
]

// ── Barrel (6w × 6h) ──
const AP: Record<string, string> = {
  W: '#8B6914', w: '#A07828', D: '#6B4E11', M: '#555555',
}
const AD = [
  ' WWWW ',
  'DWWWWD',
  'MWWWWM',
  'DWWWWD',
  'MWWWWM',
  ' DDDD ',
]

// ── Cloud (10w × 4h) ──
const QP: Record<string, string> = { C: '#F0F4F8', c: '#E2E8F0' }
const QD = [
  '   CCC    ',
  ' CCCCcCC  ',
  'CCcCCCcCCC',
  ' cCCCCCCc ',
]

// ── Progress Garden stages ──
const GP: Record<string, string> = {
  G: '#3A7A32', g: '#4E9A44', K: '#60B855',
  T: '#6B4E28', t: '#5A3E1E',
  R: '#E74C3C', Y: '#FFD700', P: '#D946EF', B: '#8B6914',
}

// Stage 0: sprout
const G0 = [
  ' g  ',
  ' gG ',
  ' Tg ',
  ' T  ',
]

// Stage 1: small plant
const G1 = [
  '  gg  ',
  ' gGg  ',
  ' gKg  ',
  '  Tg  ',
  '  T   ',
  ' tTt  ',
]

// Stage 2: small tree
const G2 = [
  '  ggg   ',
  ' gGgGg  ',
  ' gKgKg  ',
  '  ggg   ',
  '   T    ',
  '   T    ',
  '   T    ',
  '  tTt   ',
]

// Stage 3: blooming tree
const G3 = [
  '  R ggg   ',
  ' gRGgGg   ',
  ' gKRKgY   ',
  ' gGgGKg   ',
  '  gggPg   ',
  '   ggg    ',
  '    T     ',
  '    T     ',
  '    T     ',
  '   tTt    ',
]

// Stage 4: grand tree
const G4 = [
  '   YRggg    ',
  '  gRGRGgP   ',
  ' gKRKgRYPg  ',
  ' gGgGKgPgK  ',
  ' ggRggPgRg  ',
  '  gggYggg   ',
  '   ggggg    ',
  '    ggg     ',
  '    TT      ',
  '    TT      ',
  '    TT      ',
  '   tTTt     ',
]

function gardenStage(streak: number) {
  if (streak <= 0) return G0
  if (streak <= 3) return G1
  if (streak <= 7) return G2
  if (streak <= 14) return G3
  return G4
}

type ArenaStats = { rating?: number; league?: string; currentWinStreak?: number }

/* ═══════════════════════════════════════════════════════════════
   Home Page Component
   ═══════════════════════════════════════════════════════════════ */

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
    { to: '/community/events', label: t('home.quick.events', 'Events'), eyebrow: t('home.quick.events.eyebrow', 'Guild Hall') },
    { to: '/community/vacancies', label: t('home.quick.vacancies', 'Vacancies'), eyebrow: t('home.quick.vacancies.eyebrow', 'Work Tavern') },
    { to: '/community/podcasts', label: t('home.quick.podcasts', 'Podcasts'), eyebrow: t('home.quick.podcasts.eyebrow', 'Listening Room') },
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
        <Sprite data={QD} palette={QP} pixel={4} className="gw-cloud gw-cloud-1" />
        <Sprite data={QD} palette={QP} pixel={5} className="gw-cloud gw-cloud-2" />
        <Sprite data={QD} palette={QP} pixel={3} className="gw-cloud gw-cloud-3" />

        {/* ── Mountains ── */}
        <div className="gw-mountains">
          <div className="gw-mtn gw-mtn-1" />
          <div className="gw-mtn gw-mtn-2" />
          <div className="gw-mtn gw-mtn-3" />
          <div className="gw-mtn gw-mtn-4" />
          <div className="gw-mtn gw-mtn-5" />
        </div>

        {/* ── Background Trees ── */}
        <Sprite data={ID} palette={IP} pixel={4} className="gw-tree gw-tree-bg-1" />
        <Sprite data={KD} palette={KP} pixel={3} className="gw-tree gw-tree-bg-2" />
        <Sprite data={ID} palette={IP} pixel={4} className="gw-tree gw-tree-bg-3" />
        <Sprite data={KD} palette={KP} pixel={3} className="gw-tree gw-tree-bg-4" />

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
          <Sprite data={XD} palette={XP} pixel={5} />
          <span className="gw-label">🗺️ {t('home.quick.map.eyebrow', 'World Atlas')}</span>
        </Link>

        {/* Progress Garden */}
        <div className="gw-zone gw-garden">
          <Sprite data={gardenStage(streakDays)} palette={GP} pixel={5} />
          {streakDays > 3 && (
            <Sprite data={gardenStage(Math.max(0, streakDays - 5))} palette={GP} pixel={4}
              className="gw-garden-flowers" />
          )}
        </div>

        {/* Quest Board */}
        <div className="gw-zone gw-questboard">
          <Sprite data={BD} palette={BP} pixel={5} />
        </div>

        {/* Continue Journey Signpost */}
        <Link to={primaryAction?.actionUrl ?? '/practice'}
          className="gw-zone gw-signpost"
          title={t('home.hero.continue', 'Continue Journey')}>
          <Sprite data={SD} palette={SP} pixel={5} />
          <span className="gw-label gw-label-cta">
            ▶ {primaryAction
              ? t('home.hero.continue', 'Continue Journey')
              : t('home.hero.start', 'Start Training')}
          </span>
        </Link>

        {/* Tavern / Guild */}
        <Link to="/community" className="gw-zone gw-tavern"
          title={t('home.quick.events.eyebrow', 'Guild Hall')}>
          <Sprite data={TD} palette={TP} pixel={5} />
          <span className="gw-label">🏠 {t('home.quick.events.eyebrow', 'Guild Hall')}</span>
        </Link>

        {/* Weekly Boss Portal */}
        {weeklyBoss ? (
          <Link to="/practice/weekly-boss" className="gw-zone gw-portal">
            <div style={{ position: 'relative' }}>
              <div className="gw-portal-glow" />
              <Sprite data={OD} palette={OP} pixel={4} />
            </div>
            <span className="gw-label gw-label-boss">
              ⚔ {t('home.weeklyBoss.title', 'Weekly Boss')}
              {daysLeft !== null ? ` · ${daysLeft}d` : ''}
            </span>
          </Link>
        ) : (
          <div className="gw-zone gw-portal" style={{ cursor: 'default', opacity: 0.5 }}>
            <Sprite data={OD} palette={OP} pixel={4} />
          </div>
        )}

        {/* ═══════ PROPS ═══════ */}

        {/* Campfire */}
        <div className="gw-campfire">
          <Sprite data={FD} palette={FP} pixel={4} />
        </div>

        {/* Waterfall */}
        <div className="gw-waterfall">
          <Sprite data={WD} palette={WP} pixel={4} />
        </div>

        {/* Lanterns */}
        <div className="gw-lantern gw-lantern-1">
          <Sprite data={LD} palette={LP} pixel={3} />
        </div>
        <div className="gw-lantern gw-lantern-2">
          <Sprite data={LD} palette={LP} pixel={3} />
        </div>

        {/* Barrel */}
        <div className="gw-barrel">
          <Sprite data={AD} palette={AP} pixel={4} />
        </div>

        {/* Flowers */}
        <Sprite data={RD} palette={RP} pixel={3} className="gw-flowers gw-flowers-1" />
        <Sprite data={RD} palette={RP} pixel={3} className="gw-flowers gw-flowers-2" />
        <Sprite data={RD} palette={RP} pixel={4} className="gw-flowers gw-flowers-3" />
        <Sprite data={RD} palette={RP} pixel={3} className="gw-flowers gw-flowers-4" />

        {/* ═══════ CHARACTERS ═══════ */}

        {/* Player */}
        <div className="gw-player">
          <Sprite data={PD} palette={PP} pixel={4} />
        </div>

        {/* NPC near tavern */}
        <div className="gw-npc">
          <Sprite data={ND} palette={NP} pixel={3} />
        </div>

        {/* Companion pet */}
        <div className="gw-pet">
          <Sprite data={CD} palette={CP} pixel={4} />
        </div>

        {/* ── Foreground Trees (parallax blur) ── */}
        <Sprite data={KD} palette={KP} pixel={7} className="gw-tree gw-tree-fg-1" />
        <Sprite data={ID} palette={IP} pixel={7} className="gw-tree gw-tree-fg-2" />

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
        <Sprite data={gardenStage(streakDays)} palette={GP} pixel={3} />
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
