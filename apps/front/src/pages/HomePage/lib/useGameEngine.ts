import { useCallback, useEffect, useRef, useState } from 'react'

/* ═══════════════════════════════════════════════════════
   Game Engine — Character movement + interaction system
   ═══════════════════════════════════════════════════════ */

export interface WorldObject {
  id: string
  x: number          // center X in world pixels
  y: number          // center Y in world pixels
  w: number          // hitbox width
  h: number          // hitbox height
  interactRadius: number  // how close player must be to interact
  prompt?: string    // "E — Open quest board"
  action?: string    // route to navigate or 'modal:xxx'
  solid?: boolean    // blocks movement
}

export interface GameState {
  px: number                // player X
  py: number                // player Y
  facing: 'left' | 'right'
  walking: boolean
  nearObject: WorldObject | null  // closest interactable object
  interacting: string | null      // modal id currently open
}

const SPEED = 3.5          // pixels per frame
const TICK = 1000 / 60     // ~60fps
const INTERACT_KEY = 'KeyE'
const PX = 48              // player hitbox width
const PY = 64              // player hitbox height

function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2)
}

function rectsOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by
}

export function useGameEngine(
  objects: WorldObject[],
  worldW: number,
  worldH: number,
  startX: number,
  startY: number,
  onNavigate: (path: string) => void,
) {
  const [state, setState] = useState<GameState>({
    px: startX, py: startY,
    facing: 'right', walking: false,
    nearObject: null, interacting: null,
  })

  const keysRef = useRef<Set<string>>(new Set())
  const targetRef = useRef<{ x: number; y: number } | null>(null)
  const stateRef = useRef(state)
  stateRef.current = state

  // ── Keyboard input ──
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keysRef.current.add(e.code)
      // E key interaction
      if (e.code === INTERACT_KEY && stateRef.current.nearObject) {
        e.preventDefault()
        const obj = stateRef.current.nearObject
        if (obj.action?.startsWith('modal:')) {
          setState(s => ({ ...s, interacting: obj.action!.slice(6) }))
        } else if (obj.action) {
          onNavigate(obj.action)
        }
      }
      // ESC closes modals
      if (e.code === 'Escape') {
        setState(s => ({ ...s, interacting: null }))
      }
    }
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.code)
    const blur = () => keysRef.current.clear()

    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [onNavigate])

  // ── Click-to-move ──
  const handleSceneClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const scaleX = worldW / rect.width
    const scaleY = worldH / rect.height
    targetRef.current = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }, [worldW, worldH])

  // ── Click on interactive object ──
  const handleObjectClick = useCallback((obj: WorldObject) => {
    if (obj.action?.startsWith('modal:')) {
      setState(s => ({ ...s, interacting: obj.action!.slice(6) }))
    } else if (obj.action) {
      onNavigate(obj.action)
    }
  }, [onNavigate])

  // ── Close modal ──
  const closeModal = useCallback(() => {
    setState(s => ({ ...s, interacting: null }))
  }, [])

  // ── Game loop ──
  useEffect(() => {
    let raf: number
    let lastTime = 0

    const solids = objects.filter(o => o.solid)

    function canMoveTo(nx: number, ny: number) {
      // World bounds
      if (nx < 0 || ny < 0 || nx + PX > worldW || ny + PY > worldH) return false
      // Solid object collision
      for (const s of solids) {
        const ox = s.x - s.w / 2
        const oy = s.y - s.h / 2
        if (rectsOverlap(nx, ny, PX, PY, ox, oy, s.w, s.h)) return false
      }
      return true
    }

    function tick(time: number) {
      const dt = lastTime ? Math.min((time - lastTime) / TICK, 3) : 1
      lastTime = time

      const keys = keysRef.current
      let { px, py, facing, walking } = stateRef.current

      let dx = 0, dy = 0

      // Keyboard movement
      const hasKey = keys.has('ArrowLeft') || keys.has('KeyA') ||
                     keys.has('ArrowRight') || keys.has('KeyD') ||
                     keys.has('ArrowUp') || keys.has('KeyW') ||
                     keys.has('ArrowDown') || keys.has('KeyS')

      if (hasKey) {
        targetRef.current = null // cancel click-to-move
        if (keys.has('ArrowLeft') || keys.has('KeyA')) dx -= 1
        if (keys.has('ArrowRight') || keys.has('KeyD')) dx += 1
        if (keys.has('ArrowUp') || keys.has('KeyW')) dy -= 1
        if (keys.has('ArrowDown') || keys.has('KeyS')) dy += 1
      }

      // Click-to-move
      const target = targetRef.current
      if (target && !hasKey) {
        const tdx = target.x - (px + PX / 2)
        const tdy = target.y - (py + PY / 2)
        const tdist = Math.sqrt(tdx * tdx + tdy * tdy)
        if (tdist > 4) {
          dx = tdx / tdist
          dy = tdy / tdist
        } else {
          targetRef.current = null
        }
      }

      // Normalize diagonal
      if (dx !== 0 && dy !== 0) {
        const len = Math.sqrt(dx * dx + dy * dy)
        dx /= len
        dy /= len
      }

      const spd = SPEED * dt
      let nx = px + dx * spd
      let ny = py + dy * spd
      walking = dx !== 0 || dy !== 0

      if (dx < 0) facing = 'left'
      if (dx > 0) facing = 'right'

      // Try move, slide on collision
      if (walking) {
        if (canMoveTo(nx, ny)) {
          px = nx; py = ny
        } else if (canMoveTo(nx, py)) {
          px = nx
        } else if (canMoveTo(px, ny)) {
          py = ny
        }
      }

      // Find nearest interactive object
      const pcx = px + PX / 2
      const pcy = py + PY / 2
      let nearest: WorldObject | null = null
      let nearestDist = Infinity
      for (const obj of objects) {
        if (!obj.prompt) continue
        const d = dist(pcx, pcy, obj.x, obj.y)
        if (d < obj.interactRadius && d < nearestDist) {
          nearest = obj
          nearestDist = d
        }
      }

      setState(s => {
        if (s.px === px && s.py === py && s.facing === facing &&
            s.walking === walking && s.nearObject === nearest) return s
        return { ...s, px, py, facing, walking, nearObject: nearest }
      })

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [objects, worldW, worldH])

  return { state, handleSceneClick, handleObjectClick, closeModal }
}
