import { useSyncExternalStore } from 'react'
import { inboxApi } from '@/features/Inbox'
import { friendChallengeApi } from '@/features/FriendChallenge'

// Sidebar badges are counters refreshed from the backend. A small
// useSyncExternalStore-backed cache avoids N duplicate fetches when every
// NavRow asks for its own counter. The store polls every 60s while the user
// is authenticated.

export type BadgeKey = 'inboxUnread' | 'incomingChallenges' | 'arenaOpen'

interface BadgeState {
  inboxUnread: number
  incomingChallenges: number
  arenaOpen: number  // reserved: open duel invites, not yet wired
}

let state: BadgeState = { inboxUnread: 0, incomingChallenges: 0, arenaOpen: 0 }
const listeners = new Set<() => void>()
let pollHandle: ReturnType<typeof setInterval> | null = null
let refCount = 0

function snapshot(): BadgeState { return state }
function notify() { for (const l of listeners) l() }

async function refresh(): Promise<void> {
  const results = await Promise.allSettled([
    inboxApi.getUnreadCount(),
    friendChallengeApi.listIncoming({ limit: 1 }),
  ])

  const next: BadgeState = { ...state }
  if (results[0].status === 'fulfilled') {
    next.inboxUnread = results[0].value.unreadTotal
  }
  if (results[1].status === 'fulfilled') {
    next.incomingChallenges = results[1].value.total
  }

  if (
    next.inboxUnread === state.inboxUnread &&
    next.incomingChallenges === state.incomingChallenges &&
    next.arenaOpen === state.arenaOpen
  ) {
    return
  }
  state = next
  notify()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  refCount++
  if (refCount === 1) {
    void refresh() // initial fetch once someone listens
    pollHandle = setInterval(() => void refresh(), 60_000)
  }
  return () => {
    listeners.delete(listener)
    refCount--
    if (refCount === 0 && pollHandle) {
      clearInterval(pollHandle)
      pollHandle = null
    }
  }
}

/** useSidebarBadges — subscribes to the polling store. Returns current counts. */
export function useSidebarBadges(): BadgeState {
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}

/** Force a refresh (e.g. after the user opens inbox). */
export function refreshSidebarBadges(): void {
  void refresh()
}

/** Optimistic zero-out when user navigates into inbox. */
export function clearBadge(key: BadgeKey): void {
  if (state[key] === 0) return
  state = { ...state, [key]: 0 }
  notify()
}

// Re-export for tests.
export const __internal = { refresh }
