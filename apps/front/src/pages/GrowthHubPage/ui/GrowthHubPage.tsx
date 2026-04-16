import { Outlet, useLocation, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Sprite } from '@/shared/ui/Sprite'
import {
  LANTERN_P, LANTERN_D, NPC_P, NPC_D, PLAYER_P, PLAYER_D,
  PORTAL_P, PORTAL_D, BARREL_P, BARREL_D,
} from '@/shared/lib/sprites'
import { PageMeta } from '@/shared/ui/PageMeta'
import './academy-scene.css'

/* ═══════════════════════════════════════════════════════
   Academy — unique sprites
   ═══════════════════════════════════════════════════════ */

// ── Bookshelf (10w × 16h) ──
const SHELF_P: Record<string, string> = {
  W: '#5C3A1E', w: '#7A5833', D: '#4A2E14',
  R: '#8B3513', G: '#059669', B: '#3B82F6', Y: '#D97706',
  P: '#8B5CF6', M: '#6B4E28',
}
const SHELF_D = [
  ' WWWWWWWW ',
  ' WRRGBBYW ',
  ' WRRGGBYW ',
  ' WWWWWWWW ',
  ' WGBYPRYW ',
  ' WGBYPRwW ',
  ' WWWWWWWW ',
  ' WPRGYBGW ',
  ' WPRGYBgW ',
  ' WWWWWWWW ',
  ' WBYGPRRW ',
  ' WBYGPRrW ',
  ' WWWWWWWW ',
  '  MM  MM  ',
  '  MM  MM  ',
  '  DD  DD  ',
]

// ── Study Desk (12w × 8h) ──
const DESK_P: Record<string, string> = {
  W: '#8B6914', w: '#A07828', D: '#6B4E11',
  P: '#F5E6C8', I: '#2C1810', B: '#5C3A1E',
  G: '#FFD700', Q: '#8B5CF6',
}
const DESK_D = [
  ' WWWWWWWWWW ',
  ' WPIPIPPIPW ',
  ' WPPPPPPPPW ',
  ' WPIQPPIIPW ',
  ' WWWWWWWWWW ',
  '  BB    BB  ',
  '  BB    BB  ',
  '  DD    DD  ',
]

// ── Trial Gate (12w × 16h) ──
const GATE_P: Record<string, string> = {
  S: '#5A5070', s: '#4A4060', G: '#6366F1', g: '#818CF8',
  P: '#C7D2FE', p: '#A5B4FC', F: '#E0E7FF', W: '#3A3050',
}
const GATE_D = [
  '    PPPP    ',
  '  PPGggGPP  ',
  ' PGg    gGP ',
  ' Pg  FF  gP ',
  'SG  FPPF  GS',
  'Sg   PP   gS',
  'SG        GS',
  'Sg        gS',
  'SG        GS',
  'SG  FPPF  GS',
  ' Sg  FF  gS ',
  ' SGg    gGS ',
  '  SSGggGSS  ',
  '    SSSS    ',
  '  WWWWWWWW  ',
  ' WWWWWWWWWW ',
]

// ── Crystal Ball (8w × 8h) ──
const CRYSTAL_P: Record<string, string> = {
  S: '#808080', G: '#8B5CF6', g: '#6D28D9',
  P: '#C4B5FD', p: '#A78BFA', F: '#DDD6FE',
  W: '#5C3A1E', D: '#4A2E14',
}
const CRYSTAL_D = [
  '   PP   ',
  '  PGgP  ',
  ' PGFgGP ',
  ' PgFGgP ',
  '  PGgP  ',
  '   PP   ',
  '  WWWW  ',
  '  DDDD  ',
]

// ── Scroll Rack (8w × 10h) ──
const SCROLL_P: Record<string, string> = {
  W: '#8B6914', D: '#6B4E11', P: '#F5E6C8', p: '#E5D0A8',
  R: '#CD5C5C', B: '#5C3A1E',
}
const SCROLL_D = [
  ' WWWWWW ',
  ' WPPPWW ',
  ' WRPpWW ',
  ' WWWWWW ',
  ' WPPRWW ',
  ' WPPpWW ',
  ' WWWWWW ',
  '  BB BB ',
  '  BB BB ',
  '  DD DD ',
]

// ── Floating Book (6w × 4h) ──
const BOOK_P: Record<string, string> = {
  R: '#8B3513', G: '#059669', B: '#3B82F6', P: '#F5E6C8',
}
const BOOK1_D = ['RRRRRR', 'RPPPPR', 'RPPPPR', 'RRRRRR']
const BOOK2_D = ['GGGGGG', 'GPPPPG', 'GPPPPG', 'GGGGGG']
const BOOK3_D = ['BBBBBB', 'BPPPPB', 'BPPPPB', 'BBBBBB']

export function GrowthHubPage() {
  const { t } = useTranslation()
  const location = useLocation()

  const isSubPage = location.pathname !== '/prepare' && location.pathname !== '/prepare/'

  return (
    <div className="flex flex-col min-h-screen">
      <PageMeta title={t('route.prepare.title')} description={t('nav.desc.prepare')} canonicalPath="/prepare" />

      {!isSubPage && (
        <div className="ac">
          <div className="ac-scene">

            {/* Walls & Floor */}
            <div className="ac-walls" />
            <div className="ac-floor" />

            {/* Stained Glass Window */}
            <div className="ac-window" />

            {/* ═══ INTERACTIVE ZONES ═══ */}

            {/* Left Bookshelf (category browsing) */}
            <Link to="/prepare/interview-prep" className="ac-zone ac-bookshelf-l">
              <Sprite data={SHELF_D} palette={SHELF_P} pixel={5} />
              <span className="ac-label">📚 {t('route.prepare.title')}</span>
            </Link>

            {/* Right Bookshelf */}
            <div className="ac-zone ac-bookshelf-r" style={{ cursor: 'default' }}>
              <Sprite data={SHELF_D} palette={SHELF_P} pixel={5} />
            </div>

            {/* Study Desk (solo practice) */}
            <Link to="/prepare/interview-prep" className="ac-zone ac-desk">
              <Sprite data={DESK_D} palette={DESK_P} pixel={5} />
              <span className="ac-label ac-label-main">📖 {t('nav.desc.prepare')}</span>
            </Link>

            {/* Trial Gate (mock interviews) */}
            <Link to="/prepare/interview-prep?tab=mock" className="ac-zone ac-gate">
              <div style={{ position: 'relative' }}>
                <div className="ac-gate-glow" />
                <Sprite data={GATE_D} palette={GATE_P} pixel={4} />
              </div>
              <span className="ac-label">⚔ {t('interviewPrep.mock.title', 'Mock Trial')}</span>
            </Link>

            {/* Scroll Rack (tasks/blueprints) */}
            <Link to="/prepare/interview-prep" className="ac-zone ac-scrolls">
              <Sprite data={SCROLL_D} palette={SCROLL_P} pixel={4} />
              <span className="ac-label">📜 {t('interviewPrep.solo.title', 'Solo Practice')}</span>
            </Link>

            {/* Crystal Ball (progress) */}
            <div className="ac-zone ac-crystal" style={{ cursor: 'default' }}>
              <div style={{ position: 'relative' }}>
                <div className="ac-crystal-glow" />
                <Sprite data={CRYSTAL_D} palette={CRYSTAL_P} pixel={5} />
              </div>
            </div>

            {/* ═══ PROPS ═══ */}

            {/* Lanterns */}
            <div className="ac-prop" style={{ left: '8%', top: '20%' }}>
              <Sprite data={LANTERN_D} palette={LANTERN_P} pixel={3} />
            </div>
            <div className="ac-prop" style={{ right: '8%', top: '20%' }}>
              <Sprite data={LANTERN_D} palette={LANTERN_P} pixel={3} />
            </div>
            <div className="ac-prop" style={{ left: '35%', top: '15%' }}>
              <Sprite data={LANTERN_D} palette={LANTERN_P} pixel={2} />
            </div>
            <div className="ac-prop" style={{ right: '35%', top: '15%' }}>
              <Sprite data={LANTERN_D} palette={LANTERN_P} pixel={2} />
            </div>

            {/* Floating books */}
            <div className="ac-floating-book" style={{ left: '15%', top: '20%' }}>
              <Sprite data={BOOK1_D} palette={BOOK_P} pixel={4} />
            </div>
            <div className="ac-floating-book" style={{ right: '20%', top: '25%' }}>
              <Sprite data={BOOK2_D} palette={BOOK_P} pixel={3} />
            </div>
            <div className="ac-floating-book" style={{ left: '45%', top: '15%' }}>
              <Sprite data={BOOK3_D} palette={BOOK_P} pixel={3} />
            </div>

            {/* ═══ CHARACTERS ═══ */}

            {/* Librarian NPC */}
            <div className="ac-npc ac-librarian">
              <Sprite data={NPC_D} palette={NPC_P} pixel={3} />
            </div>

            {/* Student */}
            <div className="ac-npc ac-student">
              <Sprite data={PLAYER_D} palette={PLAYER_P} pixel={3} />
            </div>

            {/* Magical particles */}
            <div className="ac-particles">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="ac-particle" />
              ))}
            </div>
          </div>
        </div>
      )}

      {isSubPage && (
        <div className="ac-outlet flex-1">
          <Outlet />
        </div>
      )}

      {!isSubPage && (
        <div style={{ display: 'none' }}>
          <Outlet />
        </div>
      )}
    </div>
  )
}
