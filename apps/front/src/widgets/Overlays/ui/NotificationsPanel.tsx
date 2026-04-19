import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RpgButton } from '@/shared/ui/pixel'
import { socialApi } from '@/features/Social/api/socialApi'
import { friendChallengeApi } from '@/features/FriendChallenge'
import type { FriendRequest } from '@/features/Social/model/types'
import type { FriendChallenge } from '@/features/FriendChallenge/model/types'

type NotifKind = 'duel' | 'guild' | 'friend' | 'event' | 'system' | 'mentor' | 'shop'

interface NotifRow {
  id: string
  kind: NotifKind
  title: string
  sub: string
  hot: boolean
  createdAt: string
  onPrimary?: () => void
  primaryLabel?: string
  onSecondary?: () => void
  secondaryLabel?: string
}

const ICON: Record<NotifKind, string> = {
  duel: '⚔',
  guild: '⚑',
  friend: '✦',
  event: '◈',
  system: '★',
  mentor: '◎',
  shop: '$',
}

const COLOR: Record<NotifKind, string> = {
  duel: 'var(--rpg-danger, #a23a2a)',
  guild: 'var(--moss-1)',
  friend: 'var(--ember-1)',
  event: 'var(--r-epic)',
  system: 'var(--ember-1)',
  mentor: 'var(--r-legendary)',
  shop: 'var(--ember-2)',
}

function relTime(iso: string): string {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const diff = Math.max(0, Date.now() - t)
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

function bucket(iso: string): 'TODAY' | 'YESTERDAY' | 'EARLIER' {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return 'EARLIER'
  const diffH = (Date.now() - t) / 3_600_000
  if (diffH < 24) return 'TODAY'
  if (diffH < 48) return 'YESTERDAY'
  return 'EARLIER'
}

export function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const [friendReqs, setFriendReqs] = useState<FriendRequest[]>([])
  const [duelReqs, setDuelReqs] = useState<FriendChallenge[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    socialApi.listPendingRequests().then((r) => setFriendReqs(r.incoming)).catch(() => {})
    friendChallengeApi.listIncoming({ limit: 50 }).then((r) => setDuelReqs(r.challenges)).catch(() => {})
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

  const items = useMemo<NotifRow[]>(() => {
    const list: NotifRow[] = []
    for (const r of friendReqs) {
      list.push({
        id: `friend:${r.id}`,
        kind: 'friend',
        title: `${r.fromUsername} wants to be friends`,
        sub: r.message || 'friend request',
        hot: true,
        createdAt: r.createdAt,
        primaryLabel: 'Accept',
        onPrimary: () => acceptFriend(r.id),
        secondaryLabel: 'Decline',
        onSecondary: () => declineFriend(r.id),
      })
    }
    for (const c of duelReqs) {
      list.push({
        id: `duel:${c.id}`,
        kind: 'duel',
        title: `${c.challengerUsername} challenged you: ${c.taskTitle}`,
        sub: `${c.taskTopic || 'practice'} · duel challenge`,
        hot: true,
        createdAt: c.createdAt,
        primaryLabel: 'Open',
        onPrimary: () => {
          onClose()
          navigate('/challenges')
        },
        secondaryLabel: 'Decline',
        onSecondary: () => declineDuel(c.id),
      })
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [friendReqs, duelReqs, navigate, onClose])

  const grouped = useMemo(() => {
    const g: Record<string, NotifRow[]> = { TODAY: [], YESTERDAY: [], EARLIER: [] }
    for (const n of items) g[bucket(n.createdAt)].push(n)
    return g
  }, [items])

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 380,
        zIndex: 60,
        background: 'var(--parch-1)',
        border: '4px solid var(--ink-0)',
        boxShadow: '-6px 0 0 var(--ink-0)',
        display: 'flex',
        flexDirection: 'column',
        animation: 'rpg-slide-in-right 0.18s ease-out',
      }}
    >
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '3px dashed var(--ink-3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div
            className="font-silkscreen uppercase"
            style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.1em' }}
          >
            HERALD'S DESK
          </div>
          <h3 className="font-display" style={{ margin: 0, fontSize: 17 }}>
            Notifications · {items.length}
          </h3>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <RpgButton size="sm" onClick={onClose}>✕</RpgButton>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {items.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-2)', fontSize: 13 }}>
            Nothing new — the desk is quiet.
          </div>
        )}
        {(['TODAY', 'YESTERDAY', 'EARLIER'] as const).map((group) =>
          grouped[group].length === 0 ? null : (
            <div key={group}>
              <div className="rpg-sidenav__section" style={{ margin: '10px 14px 4px' }}>
                {group}
              </div>
              {grouped[group].map((n) => (
                <div
                  key={n.id}
                  style={{
                    padding: '10px 14px',
                    borderBottom: '1px dashed var(--ink-3)',
                    display: 'flex',
                    gap: 10,
                    alignItems: 'flex-start',
                    background: n.hot ? 'rgba(233,184,102,0.08)' : 'transparent',
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      background: COLOR[n.kind],
                      border: '2px solid var(--ink-0)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--parch-0)',
                      fontFamily: 'Silkscreen, Unbounded, monospace',
                      flexShrink: 0,
                    }}
                  >
                    {ICON[n.kind]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'Pixelify Sans, Unbounded, monospace', fontSize: 13, lineHeight: 1.3 }}>
                      {n.title}
                    </div>
                    <div
                      className="font-silkscreen uppercase"
                      style={{ fontSize: 9, color: 'var(--ink-2)', marginTop: 2, letterSpacing: '0.08em' }}
                    >
                      {n.sub} · {relTime(n.createdAt)}
                    </div>
                    {(n.onPrimary || n.onSecondary) && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                        {n.onPrimary && (
                          <RpgButton
                            size="sm"
                            variant="primary"
                            disabled={busyId === n.id.split(':')[1]}
                            onClick={n.onPrimary}
                          >
                            {n.primaryLabel}
                          </RpgButton>
                        )}
                        {n.onSecondary && (
                          <RpgButton
                            size="sm"
                            variant="ghost"
                            disabled={busyId === n.id.split(':')[1]}
                            onClick={n.onSecondary}
                          >
                            {n.secondaryLabel}
                          </RpgButton>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ),
        )}
      </div>
      <div style={{ padding: 10, borderTop: '3px dashed var(--ink-3)' }}>
        <RpgButton size="sm" style={{ width: '100%' }} onClick={() => { onClose(); navigate('/settings') }}>
          Notification preferences
        </RpgButton>
      </div>
    </div>
  )
}
