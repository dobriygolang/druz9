/**
 * DRUZ9 World Engine — pure, framework-agnostic runtime for the home hub.
 *
 * Responsibilities:
 *   • Fixed-timestep update loop (rAF driven by the host).
 *   • Player movement (keyboard + click-to-move) with AABB collision
 *     against solid POIs and props.
 *   • Hazard zones: HP ticks down while inside; respawn at campfire at 0 HP.
 *   • Interaction detection: nearest POI within radius → caller opens
 *     modal / navigates.
 *
 * The engine never touches React; host calls tick(dt) every frame and reads
 * getState().
 */

import type {
  AABB, HazardZone, POIDef, PropInstance, SceneDef, WorldRuntimeState,
} from './types'

const PLAYER_W = 18
const PLAYER_H = 24
const PLAYER_SPEED = 110 // px/sec
const HP_REGEN = 6       // per second when safe
const RESPAWN_MS = 900

function rectsOverlap(a: AABB, b: AABB): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

function pointInRect(px: number, py: number, r: AABB): boolean {
  return px >= r.x && py >= r.y && px <= r.x + r.w && py <= r.y + r.h
}

function dist(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx; const dy = ay - by
  return Math.sqrt(dx * dx + dy * dy)
}

export interface EngineInput {
  up: boolean
  down: boolean
  left: boolean
  right: boolean
  clickTarget: { x: number; y: number } | null
}

export interface EngineCallbacks {
  onInteract?: (poi: POIDef) => void
  onRespawn?: () => void
}

export class WorldEngine {
  private scene: SceneDef
  private state: WorldRuntimeState
  private solids: AABB[] = []
  private hazards: HazardZone[] = []
  private pois: POIDef[] = []
  private respawnTimer = 0
  private callbacks: EngineCallbacks = {}

  constructor(scene: SceneDef, callbacks: EngineCallbacks = {}) {
    this.scene = scene
    this.callbacks = callbacks
    this.state = {
      player: {
        x: scene.spawn.x - PLAYER_W / 2,
        y: scene.spawn.y - PLAYER_H / 2,
        facing: 'right',
        walking: false,
        hp: 100, maxHp: 100,
        energy: 100, maxEnergy: 100,
        inHazard: false,
        respawning: false,
      },
      nearPOI: null,
      openModal: null,
    }
    this.rebuildStatics()
  }

  setScene(scene: SceneDef) {
    this.scene = scene
    this.rebuildStatics()
  }

  getState(): WorldRuntimeState {
    return this.state
  }

  setModal(id: string | null) {
    this.state = { ...this.state, openModal: id }
  }

  respawn() {
    const { spawn } = this.scene
    this.state = {
      ...this.state,
      player: {
        ...this.state.player,
        x: spawn.x - PLAYER_W / 2,
        y: spawn.y - PLAYER_H / 2,
        hp: this.state.player.maxHp,
        respawning: false,
        inHazard: false,
      },
    }
    this.callbacks.onRespawn?.()
  }

  triggerInteract() {
    const poi = this.state.nearPOI
    if (poi && !this.state.player.respawning) this.callbacks.onInteract?.(poi)
  }

  /** Convenience: entity body (AABB) for a solid POI or prop. */
  private static bodyFromPOI(poi: POIDef): AABB {
    const bw = poi.bodyW ?? poi.w
    const bh = poi.bodyH ?? poi.h * 0.5
    const bx = poi.x + (poi.w - bw) / 2
    const by = poi.y + (poi.h - bh) - (poi.bodyOffsetY ?? 0)
    return { x: bx, y: by, w: bw, h: bh }
  }

  private static bodyFromProp(p: PropInstance): AABB {
    const w = p.bodyW ?? 12
    const h = p.bodyH ?? 10
    return { x: p.x - w / 2, y: p.y - h / 2, w, h }
  }

  private rebuildStatics() {
    this.solids = []
    for (const poi of this.scene.pois) {
      if (poi.solid) this.solids.push(WorldEngine.bodyFromPOI(poi))
    }
    for (const prop of this.scene.props) {
      if (prop.solid) this.solids.push(WorldEngine.bodyFromProp(prop))
    }
    this.hazards = this.scene.hazards
    this.pois = this.scene.pois
  }

  private canMoveTo(nx: number, ny: number): boolean {
    if (nx < 0 || ny < 0) return false
    if (nx + PLAYER_W > this.scene.worldW) return false
    if (ny + PLAYER_H > this.scene.worldH) return false
    const pb: AABB = { x: nx, y: ny, w: PLAYER_W, h: PLAYER_H }
    for (const s of this.solids) if (rectsOverlap(pb, s)) return false
    return true
  }

  tick(dtSec: number, input: EngineInput) {
    if (dtSec > 0.1) dtSec = 0.1 // clamp huge frames

    const p = { ...this.state.player }

    // Respawn animation lock
    if (p.respawning) {
      this.respawnTimer -= dtSec * 1000
      if (this.respawnTimer <= 0) {
        this.respawn()
        return
      }
      this.state = { ...this.state, player: p }
      return
    }

    // Movement input
    let dx = 0, dy = 0
    if (input.left) dx -= 1
    if (input.right) dx += 1
    if (input.up) dy -= 1
    if (input.down) dy += 1

    let usingClick = false
    if (dx === 0 && dy === 0 && input.clickTarget) {
      const tx = input.clickTarget.x - (p.x + PLAYER_W / 2)
      const ty = input.clickTarget.y - (p.y + PLAYER_H / 2)
      const d = Math.sqrt(tx * tx + ty * ty)
      if (d > 4) {
        dx = tx / d; dy = ty / d
        usingClick = true
      }
    }

    if (dx !== 0 && dy !== 0 && !usingClick) {
      const inv = 1 / Math.sqrt(2)
      dx *= inv; dy *= inv
    }

    const step = PLAYER_SPEED * dtSec
    const nx = p.x + dx * step
    const ny = p.y + dy * step

    p.walking = dx !== 0 || dy !== 0
    if (dx < 0) p.facing = 'left'
    else if (dx > 0) p.facing = 'right'

    if (p.walking) {
      if (this.canMoveTo(nx, ny)) { p.x = nx; p.y = ny }
      else if (this.canMoveTo(nx, p.y)) { p.x = nx }
      else if (this.canMoveTo(p.x, ny)) { p.y = ny }
    }

    // Hazards & HP
    const pcx = p.x + PLAYER_W / 2
    const pcy = p.y + PLAYER_H / 2
    let inHazard = false
    let dmg = 0
    for (const h of this.hazards) {
      if (pointInRect(pcx, pcy, h)) { inHazard = true; dmg = Math.max(dmg, h.damagePerSecond) }
    }
    if (inHazard) p.hp = Math.max(0, p.hp - dmg * dtSec)
    else p.hp = Math.min(p.maxHp, p.hp + HP_REGEN * dtSec)
    p.inHazard = inHazard

    if (p.hp <= 0 && !p.respawning) {
      p.respawning = true
      this.respawnTimer = RESPAWN_MS
    }

    // Near-POI detection
    let near: POIDef | null = null
    let bestD = Infinity
    for (const poi of this.pois) {
      const d = dist(pcx, pcy, poi.x + poi.w / 2, poi.y + poi.h / 2)
      if (d < poi.interactRadius && d < bestD) { near = poi; bestD = d }
    }

    this.state = { ...this.state, player: p, nearPOI: near }
  }
}
