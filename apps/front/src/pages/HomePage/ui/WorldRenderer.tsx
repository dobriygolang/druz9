/**
 * WorldRenderer — declarative renderer for a SceneDef + PlayerState.
 *
 * Paints terrain tiles, props, POIs, NPCs, player, prompts and hazards.
 * Purely data-driven: to add a new building/NPC edit scene.ts; here we
 * only need a spriteForPOI / spriteForProp case if you add a new kind.
 */

import { Sprite } from '@/shared/ui/Sprite'
import type { POIDef, PropInstance, SceneDef, TileKind, WorldRuntimeState } from '../lib/world/types'
import * as S from '../lib/world/sprites'

const gardenStage = S.gardenStage

interface Props {
  scene: SceneDef
  state: WorldRuntimeState
  streakDays: number
  weeklyBossReady: boolean
}

const TILE_COLORS: Record<TileKind, string> = {
  grass:       '#56984A',
  grass_light: '#6FB060',
  grass_dark:  '#3E7A35',
  dirt:        '#8A643A',
  stone:       '#8B8F98',
  plank:       '#A88150',
  soil:        '#5A3E1E',
  water:       '#3A8BB3',
  sand:        '#D7BE7A',
}

function Terrain({ scene }: { scene: SceneDef }) {
  const { terrain } = scene
  const { cols, rows, tileSize, tiles } = terrain
  const cells: React.ReactNode[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const k = tiles[r * cols + c]
      const base = TILE_COLORS[k]
      cells.push(
        <div
          key={`t-${c}-${r}`}
          className={`gw-tile gw-tile-${k}`}
          style={{
            left: c * tileSize, top: r * tileSize,
            width: tileSize, height: tileSize,
            background: base,
          }}
        />,
      )
    }
  }
  return <div className="gw-terrain" style={{ width: cols * tileSize, height: rows * tileSize }}>{cells}</div>
}

function poiSprite(kind: POIDef['kind']) {
  switch (kind) {
    case 'home':        return { data: S.HOME_D,     palette: S.HOME_P,     pixel: 6 }
    case 'guild':       return { data: S.GUILD_D,    palette: S.GUILD_P,    pixel: 6 }
    case 'academy':     return { data: S.ACADEMY_D,  palette: S.ACADEMY_P,  pixel: 6 }
    case 'shop':        return { data: S.SHOP_D,     palette: S.SHOP_P,     pixel: 6 }
    case 'quest_board': return { data: S.BOARD_D,    palette: S.BOARD_P,    pixel: 4 }
    case 'signpost':    return { data: S.SIGN_D,     palette: S.SIGN_P,     pixel: 4 }
    case 'portal':      return { data: S.PORTAL_D,   palette: S.PORTAL_P,   pixel: 6 }
    case 'atlas_table': return { data: S.ATLAS_D,    palette: S.ATLAS_P,    pixel: 5 }
    case 'training':    return null
    case 'garden':      return null
    case 'campfire':    return { data: S.FIRE_D,     palette: S.FIRE_P,     pixel: 4 }
  }
}

function propSprite(kind: PropInstance['kind']) {
  switch (kind) {
    case 'tree_oak':   return { data: S.TREE_OAK_D,   palette: S.TREE_OAK_P,   pixel: 4 }
    case 'tree_pine':  return { data: S.TREE_PINE_D,  palette: S.TREE_PINE_P,  pixel: 4 }
    case 'bush':       return { data: S.BUSH_D,       palette: S.BUSH_P,       pixel: 4 }
    case 'flower_red': return { data: S.FLOWER_R_D,   palette: S.FLOWER_R_P,   pixel: 4 }
    case 'flower_yellow': return { data: S.FLOWER_Y_D, palette: S.FLOWER_Y_P,  pixel: 4 }
    case 'rock':       return { data: S.ROCK_D,       palette: S.ROCK_P,       pixel: 3 }
    case 'fence_h':    return { data: S.FENCE_H_D,    palette: S.FENCE_H_P,    pixel: 4 }
    case 'fence_v':    return { data: S.FENCE_V_D,    palette: S.FENCE_V_P,    pixel: 4 }
    case 'lantern':    return { data: S.LANTERN_D,    palette: S.LANTERN_P,    pixel: 3 }
    case 'barrel':     return { data: S.BARREL_D,     palette: S.BARREL_P,     pixel: 3 }
    case 'crate':      return { data: S.CRATE_D,      palette: S.CRATE_P,      pixel: 3 }
    case 'bridge_plank': return { data: S.BRIDGE_PLANK_D, palette: S.BRIDGE_PLANK_P, pixel: 3 }
    case 'stump':      return { data: S.STUMP_D,      palette: S.STUMP_P,      pixel: 4 }
    case 'training_dummy': return { data: S.DUMMY_D,  palette: S.DUMMY_P,      pixel: 3 }
    case 'target':     return { data: S.TARGET_D,     palette: S.TARGET_P,     pixel: 3 }
    case 'mushroom':   return { data: S.MUSHROOM_D,   palette: S.MUSHROOM_P,   pixel: 3 }
    case 'sign_small': return { data: S.SIGN_D,       palette: S.SIGN_P,       pixel: 2 }
  }
}

function npcPalette(p: string) {
  switch (p) {
    case 'merchant': return S.NPC_MERCHANT_P
    case 'guard':    return S.NPC_GUARD_P
    case 'scholar':  return S.NPC_SCHOLAR_P
    case 'sage':     return S.NPC_SAGE_P
    case 'bard':     return S.NPC_BARD_P
    default:         return S.NPC_MERCHANT_P
  }
}

export function WorldRenderer({ scene, state, streakDays, weeklyBossReady }: Props) {
  const { player, nearPOI } = state

  // Sort render order by y so things lower in screen draw on top.
  const renderOrder = [
    ...scene.props.map(p => ({ kind: 'prop' as const, y: p.y, item: p })),
    ...scene.pois.map(p => ({ kind: 'poi' as const, y: p.y + p.h, item: p })),
    ...scene.npcs.map(n => ({ kind: 'npc' as const, y: n.y + 32, item: n })),
    { kind: 'player' as const, y: player.y + 24, item: null },
  ].sort((a, b) => a.y - b.y)

  return (
    <>
      <Terrain scene={scene} />

      {/* Hazards — visual water overlay with shimmer */}
      {scene.hazards.filter(h => h.kind === 'water').map(h => (
        <div key={h.id} className="gw-hazard gw-hazard-water" style={{
          left: h.x, top: h.y, width: h.w, height: h.h,
        }} />
      ))}

      {/* Fire ring under campfire POI */}
      {scene.pois.filter(p => p.kind === 'campfire').map(p => (
        <div key={`ring-${p.id}`} className="gw-fire-ring" style={{ left: p.x - 6, top: p.y + p.h - 12 }}>
          <Sprite data={S.FIRE_RING_D} palette={S.FIRE_RING_P} pixel={4} />
        </div>
      ))}

      {/* Render entities in y-sorted order */}
      {renderOrder.map(e => {
        if (e.kind === 'prop') {
          const prop = e.item
          const spr = propSprite(prop.kind)
          if (!spr) return null
          const w = Math.max(...spr.data.map(r => r.length)) * spr.pixel
          const h = spr.data.length * spr.pixel
          return (
            <div key={`prop-${prop.id}`} className="gw-prop" style={{
              left: prop.x - w / 2, top: prop.y - h + 10, zIndex: Math.floor(prop.y),
            }}>
              <Sprite data={spr.data} palette={spr.palette} pixel={spr.pixel} />
            </div>
          )
        }
        if (e.kind === 'poi') {
          const poi = e.item
          const active = nearPOI?.id === poi.id
          return (
            <div key={`poi-${poi.id}`} className={`gw-poi gw-poi-${poi.kind}${active ? ' is-active' : ''}`} style={{
              left: poi.x, top: poi.y, width: poi.w, height: poi.h, zIndex: Math.floor(poi.y + poi.h),
            }}>
              <POIVisual poi={poi} active={active} streakDays={streakDays} weeklyBossReady={weeklyBossReady} />
              <div className="gw-nameplate">{poi.label}</div>
              {active && <div className="gw-poi-outline" />}
            </div>
          )
        }
        if (e.kind === 'npc') {
          const npc = e.item
          return (
            <div key={`npc-${npc.id}`} className="gw-npc" style={{
              left: npc.x - 24, top: npc.y - 60, zIndex: Math.floor(npc.y + 32),
              transform: npc.facing === 'left' ? 'scaleX(-1)' : undefined,
            }}>
              <Sprite data={S.NPC_D} palette={npcPalette(npc.palette)} pixel={4} />
            </div>
          )
        }
        if (e.kind === 'player') {
          return (
            <div key="player" className={`gw-player ${player.walking ? 'walking' : ''} ${player.facing === 'left' ? 'facing-left' : ''} ${player.respawning ? 'fading' : ''}`}
              style={{ left: player.x - 12, top: player.y - 28, zIndex: Math.floor(player.y + 24) + 1 }}
            >
              <Sprite data={S.PLAYER_D} palette={S.PLAYER_P} pixel={3} className="gw-player-sprite" />
            </div>
          )
        }
        return null
      })}

      {/* Interaction prompt */}
      {nearPOI && !player.respawning && (
        <div className="gw-prompt" style={{
          left: nearPOI.x + nearPOI.w / 2 - 60,
          top: nearPOI.y - 28,
        }}>
          <div className="gw-prompt-key">E</div>
          <div className="gw-prompt-text">{nearPOI.prompt}</div>
        </div>
      )}
    </>
  )
}

function POIVisual({
  poi, active, streakDays, weeklyBossReady,
}: { poi: POIDef; active: boolean; streakDays: number; weeklyBossReady: boolean }) {
  // Garden and training grounds are data-only, rendered with props + stage sprite inside.
  if (poi.kind === 'garden') {
    return (
      <div className="gw-garden-bed">
        <div className="gw-garden-plant" style={{ left: 20, bottom: 12 }}>
          <Sprite data={gardenStage(streakDays)} palette={S.GARDEN_P} pixel={6} />
        </div>
        <div className="gw-garden-plant" style={{ left: 90, bottom: 10 }}>
          <Sprite data={gardenStage(Math.max(0, streakDays - 4))} palette={S.GARDEN_P} pixel={4} />
        </div>
        <div className="gw-garden-plant" style={{ left: 120, bottom: 20 }}>
          <Sprite data={S.FLOWER_Y_D} palette={S.FLOWER_Y_P} pixel={3} />
        </div>
      </div>
    )
  }
  if (poi.kind === 'training') {
    return (
      <div className="gw-training-pad">
        {active && <div className="gw-zone-ring" />}
      </div>
    )
  }
  const spr = poiSprite(poi.kind)
  if (!spr) return null
  return (
    <>
      {poi.kind === 'portal' && <div className="gw-portal-glow" />}
      {poi.kind === 'campfire' && <div className="gw-fire-glow" />}
      <div className={`gw-poi-sprite gw-poi-sprite-${poi.kind}`} style={{
        opacity: poi.kind === 'portal' && !weeklyBossReady ? 0.82 : 1,
      }}>
        <Sprite data={spr.data} palette={spr.palette} pixel={spr.pixel} />
      </div>
    </>
  )
}
