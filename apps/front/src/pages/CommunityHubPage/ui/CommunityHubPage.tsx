import { Outlet, useLocation, Link } from 'react-router-dom'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sprite } from '@/shared/ui/Sprite'
import {
  BOARD_P, BOARD_D, BARREL_P, BARREL_D,
  LANTERN_P, LANTERN_D, NPC_P, NPC_D,
  PLAYER_P, PLAYER_D, FIRE_P, FIRE_D,
} from '@/shared/lib/sprites'
import './guild-scene.css'

/* ═══════════════════════════════════════════════════════
   Guild Hall — unique sprites
   ═══════════════════════════════════════════════════════ */

// ── Long Table (16w × 6h) ──
const TABLE_P: Record<string, string> = {
  W: '#8B6914', w: '#A07828', D: '#6B4E11', B: '#5C3A1E',
}
const TABLE_D = [
  'WWWWWWWWWWWWWWWW',
  'WwwwwwwwwwwwwwwW',
  'WWWWWWWWWWWWWWWW',
  ' BB          BB ',
  ' BB          BB ',
  ' DD          DD ',
]

// ── Bar Counter (14w × 8h) ──
const BAR_P: Record<string, string> = {
  W: '#A07828', w: '#8B6914', D: '#6B4E11', B: '#5C3A1E',
  G: '#FFD700', P: '#F5E6C8', M: '#808080',
}
const BAR_D = [
  'WWWWWWWWWWWWWW',
  'WPPPGPPGPPPPW ',
  'WWWWWWWWWWWWWW',
  'BWwwwwwwwwwwBW',
  'BWwwwwwwwwwwBW',
  'BWwwwwwwwwwwBW',
  'BDDDDDDDDDDDBW',
  ' DDDDDDDDDDDD ',
]

// ── Globe / Map Table (10w × 10h) ──
const GLOBE_P: Record<string, string> = {
  W: '#8B6914', D: '#6B4E11', B: '#5C3A1E',
  G: '#4499CC', g: '#66BBEE', S: '#3388BB',
  F: '#FFD700',
}
const GLOBE_D = [
  '    GgG     ',
  '   GgSgG    ',
  '  GgSgSgG   ',
  '   GgSgG    ',
  '    GgG     ',
  '     F      ',
  '    FFF     ',
  '  WWWWWWW   ',
  '  WwwwwwW   ',
  '   BBBBB    ',
]

// ── Bard Chair + Lute (8w × 10h) ──
const BARD_P: Record<string, string> = {
  W: '#8B6914', w: '#A07828', D: '#6B4E11',
  S: '#C4A46C', L: '#B85030',
}
const BARD_D = [
  '   L        ',
  '   LL       ',
  '   L L      ',
  '   L  L     ',
  '  WWWW      ',
  ' WSSSSW     ',
  ' WSSSSW     ',
  ' WSSSSW     ',
  '  WWWW      ',
  '  DD DD     ',
]

// ── Shield / Banner (6w × 8h) ──
const SHIELD_P: Record<string, string> = {
  S: '#808080', G: '#FFD700', R: '#8B3513', B: '#059669', b: '#047857',
}
const SHIELD1_D = [
  ' SSSS ',
  'SGGGRS',
  'SGRRGS',
  'SGRGGS',
  'SGGRRS',
  ' SGRS ',
  '  SS  ',
  '  SS  ',
]
const SHIELD2_D = [
  ' SSSS ',
  'SBBBGS',
  'SBGBbS',
  'SBbBGS',
  'SBBGBS',
  ' SbBS ',
  '  SS  ',
  '  SS  ',
]

// ── Chandelier (8w × 6h) ──
const CHAN_P: Record<string, string> = {
  M: '#808080', W: '#5C3A1E', G: '#FFD700', g: '#FFC000', F: '#FFAA33',
}
const CHAN_D = [
  '   MM   ',
  '  MWWM  ',
  ' MWWWWM ',
  'GFGWWGFG',
  ' gFggFg ',
  '  g  g  ',
]

// ── Fireplace (12w × 10h) ──
const FPLACE_P: Record<string, string> = {
  S: '#6A6060', s: '#808080', W: '#5C3A1E',
  R: '#DD5500', r: '#FF8800', Y: '#FFAA33', y: '#FFD700',
  B: '#4A3418',
}
const FPLACE_D = [
  '  SSSSSSSS  ',
  ' SssSSSSssS ',
  ' S        S ',
  ' S  yYYy  S ',
  ' S  YrRY  S ',
  ' S RrYrR  S ',
  ' S  RrR   S ',
  ' SSSSSSSSSS ',
  ' BBBBBBBBBB ',
  'BBBBBBBBBBBB',
]

export function CommunityHubPage() {
  const { t } = useTranslation()
  const location = useLocation()
  const [search] = useState('')
  const [openCreateEvent, setOpenCreateEvent] = useState(false)

  const isSubPage = location.pathname !== '/community' && location.pathname !== '/community/'

  return (
    <div className="flex flex-col h-full">

      {/* ═══════ GUILD HALL SCENE ═══════ */}
      {!isSubPage && (
        <div className="gh">
          <div className="gh-scene">

            {/* Walls */}
            <div className="gh-walls" />
            <div className="gh-stone-wall" />
            <div className="gh-floor" />

            {/* Wooden beams */}
            <div className="gh-beam gh-beam-h gh-beam-1" />
            <div className="gh-beam gh-beam-h gh-beam-2" />
            <div className="gh-beam gh-beam-v gh-beam-3" />
            <div className="gh-beam gh-beam-v gh-beam-4" />

            {/* Fireplace (center wall) */}
            <div className="gh-fireplace">
              <div className="gh-fireplace-glow" />
              <Sprite data={FPLACE_D} palette={FPLACE_P} pixel={5} />
            </div>

            {/* Chandeliers */}
            <div className="gh-chandelier gh-chandelier-1">
              <Sprite data={CHAN_D} palette={CHAN_P} pixel={4} />
            </div>
            <div className="gh-chandelier gh-chandelier-2">
              <Sprite data={CHAN_D} palette={CHAN_P} pixel={4} />
            </div>

            {/* Shields / Banners on wall */}
            <div className="gh-banner gh-banner-1">
              <Sprite data={SHIELD1_D} palette={SHIELD_P} pixel={4} />
            </div>
            <div className="gh-banner gh-banner-2">
              <Sprite data={SHIELD2_D} palette={SHIELD_P} pixel={4} />
            </div>
            <div className="gh-banner gh-banner-3">
              <Sprite data={SHIELD2_D} palette={SHIELD_P} pixel={3} />
            </div>
            <div className="gh-banner gh-banner-4">
              <Sprite data={SHIELD1_D} palette={SHIELD_P} pixel={3} />
            </div>

            {/* ═══ INTERACTIVE ZONES ═══ */}

            {/* Long Table (Companions) */}
            <Link to="/community/people" className="gh-zone gh-companions">
              <Sprite data={TABLE_D} palette={TABLE_P} pixel={5} />
              <span className="gh-label">👥 {t('community.tab.people')}</span>
            </Link>

            {/* Notice Board (Council / Events) */}
            <Link to="/community/events" className="gh-zone gh-council">
              <Sprite data={BOARD_D} palette={BOARD_P} pixel={5} />
              <span className="gh-label">📋 {t('community.tab.events')}</span>
            </Link>

            {/* Shield Wall (Orders / Circles) */}
            <Link to="/community/circles" className="gh-zone gh-orders">
              <Sprite data={SHIELD1_D} palette={SHIELD_P} pixel={6} />
              <span className="gh-label">🛡 {t('community.tab.circles')}</span>
            </Link>

            {/* Globe Table (Atlas / Map) */}
            <Link to="/community/map" className="gh-zone gh-atlas">
              <Sprite data={GLOBE_D} palette={GLOBE_P} pixel={5} />
              <span className="gh-label">🗺️ {t('community.tab.map')}</span>
            </Link>

            {/* Bar Counter (Tavern / Vacancies) */}
            <Link to="/community/vacancies" className="gh-zone gh-tavern-bar">
              <Sprite data={BAR_D} palette={BAR_P} pixel={4} />
              <span className="gh-label">🍺 {t('community.tab.vacancies')}</span>
            </Link>

            {/* Bard's Corner (Hall of Stories / Podcasts) */}
            <Link to="/community/podcasts" className="gh-zone gh-stories">
              <Sprite data={BARD_D} palette={BARD_P} pixel={4} />
              <span className="gh-label">🎵 {t('community.tab.podcasts')}</span>
            </Link>

            {/* ═══ CHARACTERS ═══ */}

            {/* Barkeeper NPC */}
            <div className="gh-npc gh-barkeep">
              <Sprite data={NPC_D} palette={NPC_P} pixel={3} />
            </div>

            {/* Bard NPC (near stories) */}
            <div className="gh-npc gh-bard">
              <Sprite data={PLAYER_D} palette={PLAYER_P} pixel={3} />
            </div>

            {/* Seated companions */}
            <div className="gh-npc gh-seated-1">
              <Sprite data={PLAYER_D} palette={PLAYER_P} pixel={3} />
            </div>
            <div className="gh-npc gh-seated-2">
              <Sprite data={NPC_D} palette={NPC_P} pixel={3} />
            </div>

            {/* ═══ PROPS ═══ */}

            {/* Lanterns on walls */}
            <div className="gh-prop" style={{ left: '10%', top: '18%' }}>
              <Sprite data={LANTERN_D} palette={LANTERN_P} pixel={3} />
            </div>
            <div className="gh-prop" style={{ right: '10%', top: '18%' }}>
              <Sprite data={LANTERN_D} palette={LANTERN_P} pixel={3} />
            </div>

            {/* Barrels near bar */}
            <div className="gh-prop" style={{ right: '2%', bottom: '28%' }}>
              <Sprite data={BARREL_D} palette={BARREL_P} pixel={4} />
            </div>
            <div className="gh-prop" style={{ right: '7%', bottom: '26%' }}>
              <Sprite data={BARREL_D} palette={BARREL_P} pixel={3} />
            </div>

            {/* Small campfire near bard */}
            <div className="gh-prop" style={{ left: '8%', bottom: '26%' }}>
              <Sprite data={FIRE_D} palette={FIRE_P} pixel={3} />
            </div>

            {/* Dust motes */}
            <div className="gh-dust">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="gh-dust-mote" />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ SUB-PAGE CONTENT ═══ */}
      {isSubPage && (
        <div className="gh-outlet flex-1 min-h-0">
          <Outlet context={{ search, openCreateEvent, setOpenCreateEvent }} />
        </div>
      )}

      {!isSubPage && (
        <div style={{ display: 'none' }}>
          <Outlet context={{ search, openCreateEvent, setOpenCreateEvent }} />
        </div>
      )}
    </div>
  )
}
