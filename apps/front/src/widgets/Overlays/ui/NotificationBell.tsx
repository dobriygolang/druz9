import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { socialApi } from '@/features/Social/api/socialApi'
import { friendChallengeApi } from '@/features/FriendChallenge'
import type { FriendRequest } from '@/features/Social/model/types'
import type { FriendChallenge } from '@/features/FriendChallenge/model/types'

interface NotifItem {
  id: string
  kind: 'friend_request' | 'duel_challenge'
  text: string
  time: string
  unread: boolean
  onPrimary?: () => void
  primaryLabel?: string
  onSecondary?: () => void
  secondaryLabel?: string
}

// Minimal "time ago" so we don't pull in a date lib here. Handles the
// typical notification window (seconds → days); anything older just shows
// an absolute date.
function timeAgo(iso?: string): string {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const diff = Math.max(0, Date.now() - t)
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d`
  return new Date(t).toLocaleDateString()
}

/**
 * Herald's Desk notification bell. Aggregates the user's actionable
 * inbound items from the existing sources (friend requests + incoming
 * duel challenges). When we have a dedicated notification fan-out on the
 * backend we swap the two fetches here for a single stream — the
 * component contract stays the same.
 */
export function NotificationBell({ onOpen }: { onOpen?: () => void }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [friendReqs, setFriendReqs] = useState<FriendRequest[]>([])
  const [duelReqs, setDuelReqs] = useState<FriendChallenge[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)

  const refresh = () => {
    socialApi.listPendingRequests().then((r) => setFriendReqs(r.incoming)).catch(() => {})
    friendChallengeApi.listIncoming({ limit: 20 }).then((r) => setDuelReqs(r.challenges)).catch(() => {})
  }

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 60_000)
    return () => clearInterval(id)
  }, [])

  const acceptFriend = async (id: string) => {
    setBusyId(id)
    try {
      await socialApi.acceptRequest(id)
      setFriendReqs((prev) => prev.filter((r) => r.id !== id))
    } finally {
      setBusyId(null)
    }
  }
  const declineFriend = async (id: string) => {
    setBusyId(id)
    try {
      await socialApi.declineRequest(id)
      setFriendReqs((prev) => prev.filter((r) => r.id !== id))
    } finally {
      setBusyId(null)
    }
  }
  const declineDuel = async (id: string) => {
    setBusyId(id)
    try {
      await friendChallengeApi.decline(id)
      setDuelReqs((prev) => prev.filter((d) => d.id !== id))
    } finally {
      setBusyId(null)
    }
  }

  const items = useMemo<NotifItem[]>(() => {
    const list: NotifItem[] = []
    for (const r of friendReqs) {
      list.push({
        id: `friend:${r.id}`,
        kind: 'friend_request',
        text: `${r.fromUsername} wants to be friends`,
        time: timeAgo(r.createdAt),
        unread: true,
        primaryLabel: 'Accept',
        onPrimary: () => acceptFriend(r.id),
        secondaryLabel: 'Decline',
        onSecondary: () => declineFriend(r.id),
      })
    }
    for (const c of duelReqs) {
      list.push({
        id: `duel:${c.id}`,
        kind: 'duel_challenge',
        text: `${c.challengerUsername} challenged you: ${c.taskTitle}`,
        time: timeAgo(c.createdAt),
        unread: true,
        primaryLabel: 'Open',
        onPrimary: () => {
          setOpen(false)
          navigate('/challenges')
        },
        secondaryLabel: 'Decline',
        onSecondary: () => declineDuel(c.id),
      })
    }
    return list
  }, [friendReqs, duelReqs, navigate])

  const unread = items.length

  const handleClick = () => {
    if (onOpen) {
      onOpen()
    } else {
      setOpen((v) => !v)
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        className="rpg-btn rpg-btn--icon"
        onClick={handleClick}
        aria-label="Notifications"
        style={{ position: 'relative', padding: 10 }}
      >
        🔔
        {unread > 0 && (
          <span
            className="rpg-badge rpg-badge--ember"
            style={{
              position: 'absolute',
              top: -8,
              right: -8,
              fontSize: 9,
              minWidth: 18,
              height: 18,
              padding: '2px 4px',
              justifyContent: 'center',
            }}
          >
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div
          className="rpg-panel"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            width: 340,
            maxHeight: 420,
            overflow: 'auto',
            padding: 12,
            zIndex: 50,
          }}
        >
          <div
            className="font-display uppercase"
            style={{ fontSize: 14, marginBottom: 10, letterSpacing: '0.06em' }}
          >
            Missives
          </div>
          {items.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--ink-2)', padding: '8px 0' }}>
              Nothing new — the desk is quiet.
            </div>
          )}
          {items.map((n) => (
            <div
              key={n.id}
              className={`rpg-quest ${n.unread ? 'rpg-quest--active' : ''}`}
              style={{ marginBottom: 8, flexDirection: 'column', alignItems: 'stretch', gap: 6 }}
            >
              <div>
                <div style={{ fontSize: 13 }}>{n.text}</div>
                <div
                  className="font-silkscreen uppercase"
                  style={{
                    fontSize: 9,
                    color: 'var(--ink-2)',
                    letterSpacing: '0.08em',
                    marginTop: 2,
                  }}
                >
                  {n.kind.replace('_', ' ')} · {n.time} ago
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {n.onPrimary && (
                  <button
                    className="rpg-btn rpg-btn--primary rpg-btn--sm"
                    disabled={busyId === n.id.split(':')[1]}
                    onClick={n.onPrimary}
                  >
                    {n.primaryLabel}
                  </button>
                )}
                {n.onSecondary && (
                  <button
                    className="rpg-btn rpg-btn--ghost rpg-btn--sm"
                    disabled={busyId === n.id.split(':')[1]}
                    onClick={n.onSecondary}
                  >
                    {n.secondaryLabel}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
