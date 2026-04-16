/**
 * DRUZ9 World — data model for the top-down pixel hub.
 * All scene content is described through these types; the engine and the
 * renderer both consume the same data, so adding a building / NPC / hazard
 * is purely a matter of adding an entry to a scene definition.
 */

export type TileKind =
  | 'grass'
  | 'grass_dark'
  | 'grass_light'
  | 'dirt'
  | 'stone'
  | 'plank'
  | 'soil'
  | 'water'
  | 'sand'

export interface TerrainLayer {
  cols: number
  rows: number
  tileSize: number
  tiles: TileKind[]
}

export type PropKind =
  | 'tree_oak'
  | 'tree_pine'
  | 'bush'
  | 'flower_red'
  | 'flower_yellow'
  | 'rock'
  | 'fence_h'
  | 'fence_v'
  | 'lantern'
  | 'barrel'
  | 'crate'
  | 'bridge_plank'
  | 'stump'
  | 'training_dummy'
  | 'target'
  | 'mushroom'
  | 'sign_small'

export interface PropInstance {
  id: string
  kind: PropKind
  x: number
  y: number
  z?: number
  solid?: boolean
  bodyW?: number
  bodyH?: number
}

export type POIKind =
  | 'home'
  | 'guild'
  | 'academy'
  | 'shop'
  | 'quest_board'
  | 'signpost'
  | 'garden'
  | 'training'
  | 'altar'
  | 'portal'
  | 'atlas_table'
  | 'campfire'

export type POIAction =
  | { type: 'modal'; id: string }
  | { type: 'route'; path: string }

export interface POIDef {
  id: string
  kind: POIKind
  x: number          // world-pixel top-left
  y: number
  w: number          // visual footprint width
  h: number          // visual footprint height
  label: string      // RPG nameplate
  prompt: string     // "E — …"
  action?: POIAction
  /** Interaction radius measured from POI center to player center. */
  interactRadius: number
  /** Does this POI physically block movement? */
  solid?: boolean
  /** Override body rect if visual != collider. */
  bodyW?: number
  bodyH?: number
  bodyOffsetY?: number
  /** Render accent (glow colour etc). */
  accent?: 'warm' | 'cool' | 'magic' | 'danger' | 'neutral'
}

export interface HazardZone {
  id: string
  x: number
  y: number
  w: number
  h: number
  /** HP per second while inside. */
  damagePerSecond: number
  kind: 'water' | 'void' | 'fire'
}

export interface NPCDef {
  id: string
  name: string
  x: number
  y: number
  palette: 'merchant' | 'guard' | 'scholar' | 'sage' | 'bard'
  facing?: 'left' | 'right'
  patrol?: Array<{ x: number; y: number }>
  line?: string
}

export interface SpawnPoint {
  x: number
  y: number
}

export interface SceneDef {
  id: string
  worldW: number
  worldH: number
  /** Fire-anchored respawn and initial position. */
  spawn: SpawnPoint
  terrain: TerrainLayer
  props: PropInstance[]
  pois: POIDef[]
  npcs: NPCDef[]
  hazards: HazardZone[]
}

/* ─── Runtime state ────────────────────────────────────────────────── */

export interface Vec2 { x: number; y: number }

export interface AABB { x: number; y: number; w: number; h: number }

export interface PlayerState {
  x: number
  y: number
  facing: 'left' | 'right'
  walking: boolean
  hp: number
  maxHp: number
  energy: number
  maxEnergy: number
  inHazard: boolean
  respawning: boolean
}

export interface WorldRuntimeState {
  player: PlayerState
  nearPOI: POIDef | null
  openModal: string | null
}
