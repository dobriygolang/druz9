import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Avatar } from '@/shared/ui/Avatar'
import { apiClient } from '@/shared/api/base'
import { PageMeta } from '@/shared/ui/PageMeta'
import { Sprite } from '@/shared/ui/Sprite'
import {
  TREE_OAK_P, TREE_OAK_D, TREE_PINE_P, TREE_PINE_D,
  CLOUD_P, CLOUD_D, LANTERN_P, LANTERN_D,
  PORTAL_P, PORTAL_D, SIGN_P, SIGN_D,
  FLOWERS_P, FLOWERS_D, BARREL_P, BARREL_D,
  PLAYER_P, PLAYER_D, NPC_P, NPC_D,
  FIRE_P, FIRE_D,
} from '@/shared/lib/sprites'
import './practice-scene.css'

/* ═══════════════════════════════════════════════════════
   Training Grounds — unique sprites
   ═══════════════════════════════════════════════════════ */

// ── Forge Building (16w × 16h) ──
const FORGE_P: Record<string, string> = {
  S: '#808080', s: '#666666', B: '#5C3A1E', b: '#7A5833',
  W: '#A07828', w: '#8B6914', R: '#DD5500', r: '#FF8800',
  Y: '#FFAA33', D: '#4A2E14', G: '#999999', P: '#555555',
}
const FORGE_D = [
  '     SSSSSS     ',
  '    SSGGGGSS    ',
  '   SSGGGGGGSS   ',
  '  SSSSSSSSSSSS  ',
  '  BWWWWWWWWWWb  ',
  '  BWWRrWWWWWWb  ',
  '  BWWrYWWWWWWb  ',
  '  BWWRrWWWWWWb  ',
  '  BWWWWWWDWWWB  ',
  '  BWWPPWWDDWWb  ',
  '  BWWPPWWDDWWB  ',
  '  BSSSSSSSSSSB  ',
  '  PPPPPPPPPPP   ',
  '  SSSSSSSSSSS   ',
  '                ',
  '    ww    ww    ',
]

// ── Colosseum Arch (18w × 16h) ──
const COLO_P: Record<string, string> = {
  S: '#808888', s: '#6A7278', W: '#A0A8B0', w: '#B0B8C0',
  G: '#999999', D: '#5C3A1E', B: '#4A3418', P: '#707070',
}
const COLO_D = [
  '    SSSSSSSSSS    ',
  '   SSWWWWWWWWSS   ',
  '  SSWWWWWWWWWWSS  ',
  '  SWWWWWWWWWWWWS  ',
  '  SW    WW    WS  ',
  '  SW    WW    WS  ',
  '  SW    WW    WS  ',
  '  SW    WW    WS  ',
  '  SW    WW    WS  ',
  '  SWWW      WWWS  ',
  '  SSWW      WWSS  ',
  '   SS        SS   ',
  '   SS        SS   ',
  '  PPPP      PPPP  ',
  '  PPPP      PPPP  ',
  ' PPPPPP    PPPPPP ',
]

// ── Training Dummy (6w × 10h) ──
const DUMMY_P: Record<string, string> = {
  W: '#A07828', w: '#8B6914', D: '#6B4E11', S: '#C4A46C',
  H: '#D4B47C',
}
const DUMMY_D = [
  '  HH  ',
  ' HSHH ',
  '  HH  ',
  ' DWWD ',
  'DDWWDD',
  '  WW  ',
  '  WW  ',
  '  wW  ',
  '  WW  ',
  ' DDDD ',
]

// ── Weapon Rack (8w × 8h) ──
const RACK_P: Record<string, string> = {
  W: '#8B6914', D: '#6B4E11', M: '#94A3B8', m: '#808890',
  S: '#B0B8C0',
}
const RACK_D = [
  ' M  S   ',
  ' M  S m ',
  ' M  S m ',
  'DDDDDDDD',
  ' W  W   ',
  ' W  W   ',
  ' W  W   ',
  ' DD DD  ',
]

// ── Flag / Speed Track Marker (6w × 12h) ──
const FLAG_P: Record<string, string> = {
  W: '#A07828', w: '#8B6914', R: '#E74C3C', r: '#FF6B6B',
  Y: '#FFD700', D: '#6B4E11',
}
const FLAG_D = [
  ' RRRR ',
  ' RrrR ',
  ' RRRR ',
  ' RR   ',
  '  W   ',
  '  W   ',
  '  w   ',
  '  W   ',
  '  w   ',
  '  W   ',
  ' DWD  ',
  'DDDDD ',
]

// ── Review Altar (10w × 10h) ──
const ALTAR_P: Record<string, string> = {
  S: '#808888', s: '#6A7278', G: '#4499CC', g: '#66BBEE',
  P: '#8B5CF6', p: '#A78BFA', W: '#A0A8B0', B: '#555555',
}
const ALTAR_D = [
  '   GgG    ',
  '   gPg    ',
  '   GPG    ',
  '  SSSSS   ',
  ' SSWWWSS  ',
  ' SWWWWWS  ',
  ' SSWWWSS  ',
  '  SSSSS   ',
  ' BBBBBBB  ',
  'BBBBBBBBB ',
]

interface LeaderboardUser {
  userId: string
  username: string
  avatarUrl?: string
  wins: number
}

export function PracticeHubPage() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()

  const [leaders, setLeaders] = useState<LeaderboardUser[]>([])

  useEffect(() => {
    apiClient
      .get('/api/v1/code-editor/leaderboard', { params: { limit: 5 } })
      .then(res => {
        const data = res.data?.leaderboard ?? res.data?.users ?? res.data ?? []
        setLeaders(Array.isArray(data) ? data.slice(0, 5) : [])
      })
      .catch(() => setLeaders([]))
  }, [])

  const isSubPage = location.pathname !== '/practice' && location.pathname !== '/practice/'

  return (
    <div className="flex flex-col min-h-screen">
      <PageMeta title={t('practice.meta.title')} description={t('practice.meta.description')} canonicalPath="/practice" />

      {/* ═══════ TRAINING GROUNDS SCENE ═══════ */}
      {!isSubPage && (
        <div className="tg">
          <div className="tg-scene">

            {/* Sky */}
            <div className="tg-sky" />

            {/* Stars (dark mode) */}
            <div className="tg-stars">
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className="tg-star"
                  style={{ left: `${7 + (i * 41) % 86}%`, top: `${4 + (i * 19) % 32}%` }} />
              ))}
            </div>

            {/* Clouds */}
            <Sprite data={CLOUD_D} palette={CLOUD_P} pixel={4} className="tg-cloud tg-cloud-1" />
            <Sprite data={CLOUD_D} palette={CLOUD_P} pixel={5} className="tg-cloud tg-cloud-2" />

            {/* Mountains */}
            <div className="tg-mountains">
              <div className="tg-mtn tg-mtn-1" />
              <div className="tg-mtn tg-mtn-2" />
              <div className="tg-mtn tg-mtn-3" />
              <div className="tg-mtn tg-mtn-4" />
            </div>

            {/* Background Trees */}
            <Sprite data={TREE_PINE_D} palette={TREE_PINE_P} pixel={4} className="tg-bg-tree tg-bg-tree-1" />
            <Sprite data={TREE_OAK_D} palette={TREE_OAK_P} pixel={3} className="tg-bg-tree tg-bg-tree-2" />
            <Sprite data={TREE_PINE_D} palette={TREE_PINE_P} pixel={3} className="tg-bg-tree tg-bg-tree-3" />
            <Sprite data={TREE_OAK_D} palette={TREE_OAK_P} pixel={3} className="tg-bg-tree tg-bg-tree-4" />

            {/* Ground & Path */}
            <div className="tg-ground" />
            <div className="tg-arena-floor" />
            <div className="tg-path" />

            {/* ═══ BUILDINGS & ZONES ═══ */}

            {/* Forge (Code Rooms) */}
            <Link to="/practice/code-rooms" className="tg-zone tg-forge">
              <div style={{ position: 'relative' }}>
                <div className="tg-forge-glow" />
                <Sprite data={FORGE_D} palette={FORGE_P} pixel={5} />
              </div>
              <span className="tg-label">⚒ {t('practice.card.rooms.title', 'Forge')}</span>
            </Link>

            {/* Colosseum (Arena) */}
            <Link to="/practice/arena" className="tg-zone tg-colosseum">
              <Sprite data={COLO_D} palette={COLO_P} pixel={4} />
              <span className="tg-label">⚔ {t('practice.card.arena.title', 'Arena')}</span>
            </Link>

            {/* Quest Post (Daily Quest) */}
            <Link to="/practice/daily" className="tg-zone tg-quest-post">
              <Sprite data={SIGN_D} palette={SIGN_P} pixel={5} />
              <span className="tg-label tg-label-active">📜 {t('practice.card.daily.title', 'Daily Quest')}</span>
            </Link>

            {/* Boss Portal (Weekly Boss) */}
            <Link to="/practice/weekly-boss" className="tg-zone tg-boss-portal">
              <div style={{ position: 'relative' }}>
                <div className="tg-forge-glow" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 70%)' }} />
                <Sprite data={PORTAL_D} palette={PORTAL_P} pixel={4} />
              </div>
              <span className="tg-label">👑 {t('practice.card.weeklyBoss.title', 'Weekly Boss')}</span>
            </Link>

            {/* Speed Track (Speed Trial) */}
            <Link to="/practice/speed-run" className="tg-zone tg-speed-track">
              <Sprite data={FLAG_D} palette={FLAG_P} pixel={4} />
              <span className="tg-label">⚡ {t('practice.card.speedRun.title', 'Speed Trial')}</span>
            </Link>

            {/* Review Altar (Blind Review) */}
            <Link to="/practice/blind-review" className="tg-zone tg-review-altar">
              <Sprite data={ALTAR_D} palette={ALTAR_P} pixel={4} />
              <span className="tg-label">👁 {t('practice.card.blindReview.title', 'Blind Review')}</span>
            </Link>

            {/* ═══ PROPS ═══ */}

            {/* Training Dummies */}
            <div className="tg-dummy tg-dummy-1">
              <Sprite data={DUMMY_D} palette={DUMMY_P} pixel={4} />
            </div>
            <div className="tg-dummy tg-dummy-2">
              <Sprite data={DUMMY_D} palette={DUMMY_P} pixel={3} />
            </div>

            {/* Weapon Rack */}
            <div className="tg-weapon-rack">
              <Sprite data={RACK_D} palette={RACK_P} pixel={4} />
            </div>

            {/* Torches */}
            <div className="tg-torch tg-torch-1">
              <Sprite data={LANTERN_D} palette={LANTERN_P} pixel={3} />
            </div>
            <div className="tg-torch tg-torch-2">
              <Sprite data={LANTERN_D} palette={LANTERN_P} pixel={3} />
            </div>
            <div className="tg-torch tg-torch-3">
              <Sprite data={LANTERN_D} palette={LANTERN_P} pixel={3} />
            </div>

            {/* Barrels */}
            <div style={{ position: 'absolute', left: '14%', bottom: '28%', zIndex: 18, pointerEvents: 'none' }}>
              <Sprite data={BARREL_D} palette={BARREL_P} pixel={3} />
            </div>

            {/* Campfire in arena center */}
            <div style={{ position: 'absolute', left: '46%', bottom: '24%', zIndex: 22, pointerEvents: 'none' }}>
              <Sprite data={FIRE_D} palette={FIRE_P} pixel={4} />
            </div>

            {/* Flowers */}
            <Sprite data={FLOWERS_D} palette={FLOWERS_P} pixel={3}
              style={{ position: 'absolute', left: '18%', bottom: '16%', zIndex: 13, pointerEvents: 'none' }} />
            <Sprite data={FLOWERS_D} palette={FLOWERS_P} pixel={3}
              style={{ position: 'absolute', left: '75%', bottom: '15%', zIndex: 13, pointerEvents: 'none' }} />

            {/* ═══ CHARACTERS ═══ */}

            {/* Sparring fighters */}
            <div className="tg-sparrer tg-sparrer-1">
              <Sprite data={PLAYER_D} palette={PLAYER_P} pixel={3} />
            </div>
            <div className="tg-sparrer tg-sparrer-2">
              <Sprite data={NPC_D} palette={NPC_P} pixel={3} />
            </div>

            {/* Foreground trees */}
            <Sprite data={TREE_OAK_D} palette={TREE_OAK_P} pixel={7}
              className="tg-fg-tree tg-fg-tree-1" />
            <Sprite data={TREE_PINE_D} palette={TREE_PINE_P} pixel={7}
              className="tg-fg-tree tg-fg-tree-2" />

            {/* Fireflies (dark mode) */}
            <div className="tg-fireflies">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="tg-firefly" />
              ))}
            </div>
          </div>

          {/* ═══ HUD: Leaderboard ═══ */}
          {leaders.length > 0 && (
            <div className="tg-hud tg-hud-leaders">
              <div className="tg-leaders-title">🏆 {t('practice.leaders')}</div>
              {leaders.map((u, idx) => (
                <div key={u.userId} className="tg-leader">
                  <span className="tg-leader-rank">{idx + 1}</span>
                  <Avatar name={u.username} src={u.avatarUrl} size="xs" />
                  <span className="tg-leader-name">{u.username}</span>
                  <span className="tg-leader-wins">{t('practice.wins', { count: u.wins })}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ SUB-PAGE CONTENT ═══ */}
      {isSubPage && (
        <div className="tg-outlet flex-1">
          <Outlet />
        </div>
      )}

      {/* When on hub page, still mount Outlet for preloading */}
      {!isSubPage && (
        <div style={{ display: 'none' }}>
          <Outlet />
        </div>
      )}
    </div>
  )
}
