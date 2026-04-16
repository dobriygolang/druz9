/**
 * Home scene definition — data-driven description of the hub world.
 *
 * Adding a new building/NPC/hazard is a matter of pushing an entry below.
 * Positions are top-left world pixels. Centre of scene = plaza + campfire.
 */

import type {
  HazardZone, NPCDef, POIDef, PropInstance, SceneDef, TerrainLayer, TileKind,
} from './types'

export const WORLD_W = 1400
export const WORLD_H = 840
export const TILE = 40

const COLS = WORLD_W / TILE // 35
const ROWS = WORLD_H / TILE // 21

/* ─── Terrain grid ─────────────────────────────────────────────────
   Painted procedurally from a few rectangles to keep this data-light.
   Each tile is one of TileKind; renderer maps to colour+pattern.       */

function buildTerrain(): TerrainLayer {
  const tiles: TileKind[] = new Array(COLS * ROWS).fill('grass')

  const set = (col: number, row: number, k: TileKind) => {
    if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return
    tiles[row * COLS + col] = k
  }
  const fill = (c0: number, r0: number, w: number, h: number, k: TileKind) => {
    for (let r = r0; r < r0 + h; r++)
      for (let c = c0; c < c0 + w; c++) set(c, r, k)
  }

  // Noise: alternate grass variants for life
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const n = (c * 7 + r * 13) % 11
      if (n === 0) tiles[r * COLS + c] = 'grass_light'
      else if (n === 5) tiles[r * COLS + c] = 'grass_dark'
    }
  }

  // Central plaza — stone
  fill(14, 9, 7, 4, 'stone')
  // Plaza → buildings paths (dirt)
  fill(6, 10, 8, 2, 'dirt')   // to home (W)
  fill(21, 10, 8, 2, 'dirt')  // to guild / shop (E)
  fill(16, 4, 3, 5, 'dirt')   // to academy (N)
  fill(16, 13, 3, 6, 'dirt')  // to altar/portal (S)

  // Garden soil
  fill(3, 13, 4, 3, 'soil')

  // Training ground — sand
  fill(25, 14, 7, 4, 'sand')

  // Water moat along bottom-right (hazard)
  fill(26, 19, 9, 2, 'water')
  fill(24, 18, 2, 3, 'water')

  // Bridge wood planks over the moat
  fill(28, 18, 3, 3, 'plank')

  return { cols: COLS, rows: ROWS, tileSize: TILE, tiles }
}

/* ─── Props ─────────────────────────────────────────────────────── */

function perimeterTrees(): PropInstance[] {
  const list: PropInstance[] = []
  const add = (id: string, kind: PropInstance['kind'], x: number, y: number, solid = true) =>
    list.push({ id, kind, x, y, solid, bodyW: 22, bodyH: 14, z: y })

  // Top row
  add('t1', 'tree_pine', 60, 90)
  add('t2', 'tree_oak',  180, 70)
  add('t3', 'tree_pine', 300, 95)
  add('t4', 'tree_oak',  430, 70)
  add('t5', 'tree_pine', 970, 70)
  add('t6', 'tree_oak',  1100, 90)
  add('t7', 'tree_pine', 1240, 70)
  add('t8', 'tree_oak',  1340, 110)
  // Left column
  add('t9',  'tree_oak',  40, 230)
  add('t10', 'tree_pine', 60, 660)
  add('t11', 'tree_oak',  30, 500)
  // Right column
  add('t12', 'tree_pine', 1350, 300)
  add('t13', 'tree_oak',  1360, 520)
  add('t14', 'tree_pine', 1340, 700)
  return list
}

function decorProps(): PropInstance[] {
  const list: PropInstance[] = []
  // Fence around home
  for (let i = 0; i < 6; i++)
    list.push({ id: `fh-home-${i}`, kind: 'fence_h', x: 230 + i * 38, y: 490, solid: true, bodyW: 36, bodyH: 6 })
  list.push({ id: 'fv-home-1', kind: 'fence_v', x: 220, y: 470, solid: true, bodyW: 4, bodyH: 38 })

  // Fence around garden
  for (let i = 0; i < 4; i++)
    list.push({ id: `fh-g-${i}`, kind: 'fence_h', x: 130 + i * 38, y: 650, solid: true, bodyW: 36, bodyH: 6 })

  // Lanterns around plaza
  list.push({ id: 'lan-1', kind: 'lantern', x: 540, y: 380, solid: false })
  list.push({ id: 'lan-2', kind: 'lantern', x: 860, y: 380, solid: false })
  list.push({ id: 'lan-3', kind: 'lantern', x: 540, y: 540, solid: false })
  list.push({ id: 'lan-4', kind: 'lantern', x: 860, y: 540, solid: false })
  list.push({ id: 'lan-home', kind: 'lantern', x: 190, y: 420, solid: false })
  list.push({ id: 'lan-guild', kind: 'lantern', x: 1110, y: 420, solid: false })
  list.push({ id: 'lan-academy', kind: 'lantern', x: 630, y: 220, solid: false })
  list.push({ id: 'lan-academy-2', kind: 'lantern', x: 790, y: 220, solid: false })

  // Barrels / crates near shop + guild
  list.push({ id: 'bar-1', kind: 'barrel', x: 1060, y: 560, solid: true, bodyW: 20, bodyH: 20 })
  list.push({ id: 'bar-2', kind: 'barrel', x: 1090, y: 566, solid: true, bodyW: 20, bodyH: 20 })
  list.push({ id: 'cr-1', kind: 'crate', x: 1150, y: 560, solid: true, bodyW: 24, bodyH: 20 })
  list.push({ id: 'bar-shop-1', kind: 'barrel', x: 1230, y: 440, solid: true, bodyW: 20, bodyH: 20 })
  list.push({ id: 'cr-shop-1', kind: 'crate', x: 1250, y: 468, solid: true, bodyW: 24, bodyH: 20 })

  // Bushes & flowers scattered
  const flora: Array<[PropInstance['kind'], number, number]> = [
    ['bush', 340, 660], ['bush', 480, 660], ['bush', 1000, 670], ['bush', 620, 170],
    ['flower_red', 420, 620], ['flower_yellow', 520, 640], ['flower_red', 950, 620],
    ['flower_yellow', 380, 720], ['flower_red', 1080, 660], ['flower_yellow', 640, 430],
    ['flower_red', 780, 430], ['flower_yellow', 580, 450], ['mushroom', 70, 420],
    ['mushroom', 1330, 430], ['mushroom', 240, 720], ['stump', 860, 170],
    ['rock', 300, 460], ['rock', 1060, 480], ['rock', 400, 740], ['rock', 900, 740],
  ]
  flora.forEach(([k, x, y], i) => list.push({
    id: `f-${i}`, kind: k, x, y,
    solid: k === 'rock' || k === 'stump',
    bodyW: 16, bodyH: 10,
  }))

  // Training dummies + targets (SE training ground)
  list.push({ id: 'dummy-1', kind: 'training_dummy', x: 1060, y: 660, solid: true, bodyW: 18, bodyH: 20 })
  list.push({ id: 'dummy-2', kind: 'training_dummy', x: 1130, y: 680, solid: true, bodyW: 18, bodyH: 20 })
  list.push({ id: 'target-1', kind: 'target', x: 1200, y: 660, solid: true, bodyW: 18, bodyH: 20 })

  return list
}

const PROPS: PropInstance[] = [...perimeterTrees(), ...decorProps()]

/* ─── POIs ─────────────────────────────────────────────────────── */

export interface SceneLabels {
  home: string; homePrompt: string
  guild: string; guildPrompt: string
  academy: string; academyPrompt: string
  shop: string; shopPrompt: string
  board: string; boardPrompt: string
  sign: string; signPrompt: string
  garden: string; gardenPrompt: string
  training: string; trainingPrompt: string
  altar: string; altarPrompt: string
  portal: string; portalPrompt: string
  atlas: string; atlasPrompt: string
  fire: string; firePrompt: string
}

export function buildScene(labels: SceneLabels, continueRoute: string | undefined): SceneDef {
  const pois: POIDef[] = [
    // Player home — NW
    { id: 'home', kind: 'home',
      x: 120, y: 360, w: 192, h: 160,
      label: labels.home, prompt: labels.homePrompt,
      action: { type: 'route', path: '/profile' },
      interactRadius: 110, solid: true, bodyW: 170, bodyH: 80, bodyOffsetY: 6, accent: 'warm' },

    // Guild / tavern — NE
    { id: 'guild', kind: 'guild',
      x: 1040, y: 340, w: 252, h: 176,
      label: labels.guild, prompt: labels.guildPrompt,
      action: { type: 'route', path: '/community' },
      interactRadius: 130, solid: true, bodyW: 230, bodyH: 90, bodyOffsetY: 6, accent: 'warm' },

    // Academy — N (between home & guild, back)
    { id: 'academy', kind: 'academy',
      x: 620, y: 70, w: 176, h: 232,
      label: labels.academy, prompt: labels.academyPrompt,
      action: { type: 'modal', id: 'academy' },
      interactRadius: 130, solid: true, bodyW: 130, bodyH: 90, bodyOffsetY: 10, accent: 'cool' },

    // Shop — E
    { id: 'shop', kind: 'shop',
      x: 1150, y: 520, w: 198, h: 144,
      label: labels.shop, prompt: labels.shopPrompt,
      action: { type: 'modal', id: 'shop' },
      interactRadius: 110, solid: true, bodyW: 170, bodyH: 70, bodyOffsetY: 6, accent: 'warm' },

    // Quest board — centre-left
    { id: 'board', kind: 'quest_board',
      x: 450, y: 430, w: 56, h: 72,
      label: labels.board, prompt: labels.boardPrompt,
      action: { type: 'modal', id: 'quests' },
      interactRadius: 80, solid: false, accent: 'warm' },

    // Signpost — centre (continue journey)
    { id: 'sign', kind: 'signpost',
      x: 890, y: 430, w: 44, h: 72,
      label: labels.sign, prompt: labels.signPrompt,
      action: continueRoute ? { type: 'route', path: continueRoute } : { type: 'route', path: '/practice' },
      interactRadius: 80, solid: false, accent: 'warm' },

    // Progress garden — SW
    { id: 'garden', kind: 'garden',
      x: 120, y: 560, w: 160, h: 120,
      label: labels.garden, prompt: labels.gardenPrompt,
      action: { type: 'modal', id: 'garden' },
      interactRadius: 110, solid: false, accent: 'cool' },

    // Training ground — SE (sandy area)
    { id: 'training', kind: 'training',
      x: 1030, y: 620, w: 220, h: 120,
      label: labels.training, prompt: labels.trainingPrompt,
      action: { type: 'modal', id: 'training' },
      interactRadius: 120, solid: false, accent: 'warm' },

    // Altar / portal — S
    { id: 'portal', kind: 'portal',
      x: 650, y: 600, w: 128, h: 164,
      label: labels.portal, prompt: labels.portalPrompt,
      action: { type: 'modal', id: 'boss' },
      interactRadius: 120, solid: true, bodyW: 90, bodyH: 40, bodyOffsetY: 0, accent: 'magic' },

    // Atlas table — W
    { id: 'atlas', kind: 'atlas_table',
      x: 310, y: 720, w: 160, h: 96,
      label: labels.atlas, prompt: labels.atlasPrompt,
      action: { type: 'route', path: '/atlas' },
      interactRadius: 100, solid: true, bodyW: 140, bodyH: 50, bodyOffsetY: 2, accent: 'cool' },

    // Campfire — centre of plaza (safe anchor, respawn)
    { id: 'fire', kind: 'campfire',
      x: 680, y: 430, w: 56, h: 40,
      label: labels.fire, prompt: labels.firePrompt,
      action: { type: 'modal', id: 'rest' },
      interactRadius: 80, solid: false, accent: 'warm' },
  ]

  const npcs: NPCDef[] = [
    { id: 'npc-guild-1', name: 'Brenn', x: 1080, y: 520, palette: 'guard', facing: 'left',
      line: 'The guild always needs sharp minds.' },
    { id: 'npc-guild-2', name: 'Hilda', x: 1160, y: 524, palette: 'bard', facing: 'right',
      line: 'Join us by the hearth, traveller.' },
    { id: 'npc-board', name: 'Quill', x: 520, y: 490, palette: 'scholar', facing: 'left',
      line: 'New quests posted at dawn.' },
    { id: 'npc-shop', name: 'Mera', x: 1220, y: 640, palette: 'merchant', facing: 'left',
      line: 'Seeds, decor, and curiosities.' },
    { id: 'npc-academy', name: 'Elowen', x: 720, y: 310, palette: 'sage', facing: 'right',
      line: 'Knowledge is patient.' },
  ]

  const hazards: HazardZone[] = [
    // Water moat (bottom-right) — damage per second
    { id: 'moat', kind: 'water', x: 24 * TILE, y: 18 * TILE, w: 11 * TILE, h: 3 * TILE, damagePerSecond: 18 },
  ]

  return {
    id: 'home',
    worldW: WORLD_W, worldH: WORLD_H,
    spawn: { x: 700, y: 500 },  // near campfire
    terrain: buildTerrain(),
    props: PROPS,
    pois, npcs, hazards,
  }
}
