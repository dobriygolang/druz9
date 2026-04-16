/**
 * React binding for WorldEngine — owns the rAF loop, input, and state sync.
 *
 * The engine instance is stable for the lifetime of the hook; scene data is
 * swapped via engine.setScene when the caller rebuilds it. Navigation and
 * interaction callbacks live in refs so they can change freely without
 * tearing down the simulation.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { WorldEngine, type EngineInput } from './engine'
import type { POIDef, SceneDef, WorldRuntimeState } from './types'

export interface UseWorldOptions {
  scene: SceneDef
  onRoute?: (path: string) => void
}

export function useWorld({ scene, onRoute }: UseWorldOptions) {
  const onRouteRef = useRef(onRoute)
  onRouteRef.current = onRoute

  const engineRef = useRef<WorldEngine | null>(null)
  const setStateRef = useRef<((updater: (s: WorldRuntimeState) => WorldRuntimeState) => void) | null>(null)

  if (engineRef.current === null) {
    engineRef.current = new WorldEngine(scene, {
      onInteract: (poi: POIDef) => {
        const engine = engineRef.current
        if (!engine) return
        const action = poi.action
        if (!action) return
        if (action.type === 'modal') {
          engine.setModal(action.id)
          setStateRef.current?.(s => ({ ...s, openModal: action.id }))
        } else if (action.type === 'route') {
          onRouteRef.current?.(action.path)
        }
      },
    })
  }

  const [state, setState] = useState<WorldRuntimeState>(() => engineRef.current!.getState())
  setStateRef.current = setState
  const keys = useRef<Set<string>>(new Set())
  const clickTarget = useRef<{ x: number; y: number } | null>(null)

  // Swap scene data in-place (preserves player state, modal, etc.).
  useEffect(() => {
    engineRef.current?.setScene(scene)
  }, [scene])

  // Keyboard input
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current.add(e.code)
      if (e.code === 'KeyE' || e.code === 'Enter') {
        e.preventDefault()
        engineRef.current?.triggerInteract()
      }
      if (e.code === 'Escape') {
        engineRef.current?.setModal(null)
        setState(s => ({ ...s, openModal: null }))
      }
    }
    const up = (e: KeyboardEvent) => keys.current.delete(e.code)
    const blur = () => keys.current.clear()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [])

  // rAF loop
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const step = (t: number) => {
      const dt = Math.min((t - last) / 1000, 0.05)
      last = t
      const engine = engineRef.current
      if (engine) {
        const k = keys.current
        const input: EngineInput = {
          up: k.has('KeyW') || k.has('ArrowUp'),
          down: k.has('KeyS') || k.has('ArrowDown'),
          left: k.has('KeyA') || k.has('ArrowLeft'),
          right: k.has('KeyD') || k.has('ArrowRight'),
          clickTarget: clickTarget.current,
        }
        if (k.size > 0) clickTarget.current = null
        engine.tick(dt, input)
        setState(prev => {
          const next = engine.getState()
          if (
            prev.player.x === next.player.x &&
            prev.player.y === next.player.y &&
            prev.player.facing === next.player.facing &&
            prev.player.walking === next.player.walking &&
            prev.player.hp === next.player.hp &&
            prev.player.inHazard === next.player.inHazard &&
            prev.player.respawning === next.player.respawning &&
            prev.nearPOI?.id === next.nearPOI?.id &&
            prev.openModal === next.openModal
          ) return prev
          return { ...next }
        })
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [])

  const handleSceneClick = useCallback((e: React.MouseEvent<HTMLDivElement>, worldW: number, worldH: number) => {
    const rect = e.currentTarget.getBoundingClientRect()
    clickTarget.current = {
      x: ((e.clientX - rect.left) / rect.width) * worldW,
      y: ((e.clientY - rect.top) / rect.height) * worldH,
    }
  }, [])

  const closeModal = useCallback(() => {
    engineRef.current?.setModal(null)
    setState(s => ({ ...s, openModal: null }))
  }, [])

  const openModal = useCallback((id: string) => {
    engineRef.current?.setModal(id)
    setState(s => ({ ...s, openModal: id }))
  }, [])

  return { state, handleSceneClick, closeModal, openModal }
}
