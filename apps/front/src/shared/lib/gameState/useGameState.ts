import { useCallback, useEffect, useSyncExternalStore } from 'react'
import type { GameUser, Tweaks } from './types'

// Mock game state — replaced by API later.
// Stored in localStorage + broadcast via subscribe.

const USER_KEY = 'druz9.game.user.v1'
const TWEAKS_KEY = 'druz9.game.tweaks.v1'

const DEFAULT_USER: GameUser = {
  name: 'Wanderer',
  title: 'Initiate',
  level: 7,
  xp: 1240,
  xpMax: 2000,
  xpPct: 62,
  streak: 4,
  achievements: 38,
  achievementsMax: 240,
  duelsWon: 12,
  duelsLost: 5,
  guild: 'The Ember Pact',
  gold: 1842,
  gems: 24,
  arenaPoints: 410,
}

const DEFAULT_TWEAKS: Tweaks = {
  roomLayout: 'cozy',
  heroPose: 'idle',
  pet: 'slime',
  season: 'day',
  density: 'normal',
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return { ...fallback, ...JSON.parse(raw) } as T
  } catch {
    return fallback
  }
}

let userState: GameUser = load(USER_KEY, DEFAULT_USER)
let tweaksState: Tweaks = load(TWEAKS_KEY, DEFAULT_TWEAKS)

const listeners = new Set<() => void>()
function emit() {
  listeners.forEach((l) => l())
}
function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function setUser(patch: Partial<GameUser>) {
  userState = { ...userState, ...patch }
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(userState))
  } catch {
    /* ignore */
  }
  emit()
}

export function setTweaks(patch: Partial<Tweaks>) {
  tweaksState = { ...tweaksState, ...patch }
  try {
    localStorage.setItem(TWEAKS_KEY, JSON.stringify(tweaksState))
  } catch {
    /* ignore */
  }
  emit()
}

export function useGameUser(): GameUser {
  return useSyncExternalStore(
    subscribe,
    () => userState,
    () => userState,
  )
}

export function useTweaks(): [Tweaks, (p: Partial<Tweaks>) => void] {
  const tweaks = useSyncExternalStore(
    subscribe,
    () => tweaksState,
    () => tweaksState,
  )
  const update = useCallback((p: Partial<Tweaks>) => setTweaks(p), [])
  return [tweaks, update]
}

export function useApplySeasonToHtml() {
  const [{ season, density }] = useTweaks()
  useEffect(() => {
    const html = document.documentElement
    html.dataset.season = season
    html.dataset.density = density
    return () => {
      /* keep as-is on unmount */
    }
  }, [season, density])
}
