import { useSyncExternalStore, useCallback } from 'react'
import { play } from '@/shared/lib/sound'

export interface Toast {
  id: string
  kind: 'QUEST' | 'DUEL' | 'GUILD' | 'LOOT'
  title: string
  body?: string
  icon?: string
  color?: string
}

type ToastInput = Omit<Toast, 'id'>

let state: Toast[] = []
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((l) => l())
}

function getState() {
  return state
}

export function addToast(input: ToastInput) {
  const id = Math.random().toString(36).slice(2)
  state = [...state, { id, ...input }]
  notify()
  // Sound mapped per kind — non-blocking, silent when sound disabled.
  switch (input.kind) {
    case 'QUEST': play('questAccept'); break
    case 'DUEL':  play('duelInvite');  break
    case 'LOOT':  play('submitPass');  break
    case 'GUILD': play('toast');       break
    default:      play('toast')
  }
  setTimeout(() => dismissToast(id), 4200)
}

export function dismissToast(id: string) {
  state = state.filter((t) => t.id !== id)
  notify()
}

export function useToasts() {
  const toasts = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    getState,
    getState,
  )

  const fire = useCallback((input: ToastInput) => addToast(input), [])
  const dismiss = useCallback((id: string) => dismissToast(id), [])

  return { toasts, fire, dismiss }
}
