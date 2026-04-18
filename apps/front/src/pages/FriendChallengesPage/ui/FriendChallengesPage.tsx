import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Panel, RpgButton, Badge, PageHeader } from '@/shared/ui/pixel'
import { useAuth } from '@/app/providers/AuthProvider'
import {
  friendChallengeApi,
  ChallengeDifficulty,
  deriveViewerStatus,
  type FriendChallenge,
  type ViewerStatus,
} from '@/features/FriendChallenge'

type Tab = 'incoming' | 'sent' | 'history'

const TOPICS = ['arrays', 'strings', 'trees', 'graphs', 'dp', 'design']

export function FriendChallengesPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const me = user?.id ?? ''

  const [tab, setTab] = useState<Tab>('incoming')
  const [items, setItems] = useState<FriendChallenge[]>([])
  const [loading, setLoading] = useState(true)
  const [composeOpen, setComposeOpen] = useState(false)
  const [incomingCount, setIncomingCount] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const api =
        tab === 'incoming' ? friendChallengeApi.listIncoming :
        tab === 'sent' ? friendChallengeApi.listSent :
        friendChallengeApi.listHistory
      const resp = await api()
      setItems(resp.challenges)
      if (tab === 'incoming') setIncomingCount(resp.total)
    } catch (e) {
      console.error('friend challenges load:', e)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => {
    void load()
  }, [load])

  // Secondary fetch to keep the badge on "incoming" tab fresh.
  useEffect(() => {
    if (tab === 'incoming') return
    friendChallengeApi
      .listIncoming({ limit: 1 })
      .then((r) => setIncomingCount(r.total))
      .catch(() => {})
  }, [tab])

  const handleAccept = (c: FriendChallenge) => {
    // For the first version we route to training task page; solving there can
    // call friendChallengeApi.submit() on success. Deep integration is a
    // follow-up.
    navigate(`/training/task/${c.taskRef || 'graph-dfs'}`)
  }

  const handleDecline = async (c: FriendChallenge) => {
    try {
      await friendChallengeApi.decline(c.id)
      await load()
    } catch (e) {
      console.error('decline failed:', e)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Social · asynchronous duels"
        title="Friend Challenges"
        subtitle="Send a task to a friend. They solve it on their time. Faster + correct wins."
        right={
          <RpgButton size="sm" variant="primary" onClick={() => setComposeOpen(true)}>
            + Send challenge
          </RpgButton>
        }
      />

      <div className="rpg-tabs">
        <div
          className={`rpg-tab ${tab === 'incoming' ? 'rpg-tab--active' : ''}`}
          onClick={() => setTab('incoming')}
        >
          Incoming
          {incomingCount > 0 && (
            <Badge variant="ember" style={{ marginLeft: 6, fontSize: 8 }}>
              {incomingCount}
            </Badge>
          )}
        </div>
        <div className={`rpg-tab ${tab === 'sent' ? 'rpg-tab--active' : ''}`} onClick={() => setTab('sent')}>
          Sent
        </div>
        <div
          className={`rpg-tab ${tab === 'history' ? 'rpg-tab--active' : ''}`}
          onClick={() => setTab('history')}
        >
          History
        </div>
      </div>

      <Panel style={{ padding: 0, overflow: 'hidden' }}>
        {loading && <EmptyState label="Loading…" />}
        {!loading && items.length === 0 && <EmptyState label={emptyLabel(tab)} />}
        {!loading &&
          items.map((c, i) => (
            <ChallengeRow
              key={c.id}
              c={c}
              currentUserId={me}
              last={i === items.length - 1}
              onAccept={() => handleAccept(c)}
              onDecline={() => handleDecline(c)}
              onView={() => navigate(`/duel/replay/${c.id}`)}
            />
          ))}
      </Panel>

      {composeOpen && (
        <ComposeChallengeModal
          onClose={() => setComposeOpen(false)}
          onSent={async () => {
            setComposeOpen(false)
            setTab('sent')
            await load()
          }}
        />
      )}
    </>
  )
}

function emptyLabel(tab: Tab): string {
  if (tab === 'incoming') return 'No incoming challenges — invite a friend ▸'
  if (tab === 'sent') return 'No sent challenges yet'
  return 'No past challenges'
}

function EmptyState({ label }: { label: string }) {
  return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-2)', fontSize: 14 }}>
      {label}
    </div>
  )
}

// ---------- Row ----------

const STATUS_ACCENT: Record<ViewerStatus, string> = {
  'your-turn':    'var(--ember-1)',
  'their-turn':   'var(--r-legendary)',
  'pending-them': 'var(--ink-3)',
  'pending-you':  'var(--ink-3)',
  won:            'var(--moss-1)',
  lost:           'var(--rpg-danger, #a23a2a)',
  draw:           'var(--ink-2)',
  expired:        'var(--rpg-danger, #a23a2a)',
  declined:       'var(--ink-3)',
}

const STATUS_LABEL: Record<ViewerStatus, string> = {
  'your-turn':    'your turn',
  'their-turn':   'their turn',
  'pending-them': 'awaiting them',
  'pending-you':  'pending',
  won:            'won',
  lost:           'lost',
  draw:           'draw',
  expired:        'expired',
  declined:       'declined',
}

function diffLabel(d: ChallengeDifficulty): string {
  switch (d) {
    case ChallengeDifficulty.EASY: return 'easy'
    case ChallengeDifficulty.MEDIUM: return 'medium'
    case ChallengeDifficulty.HARD: return 'hard'
    default: return '—'
  }
}

function timeUntil(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now()
  if (diff <= 0) return 'expired'
  const h = Math.floor(diff / 3_600_000)
  if (h > 24) return `${Math.floor(h / 24)}d left`
  if (h > 0) return `${h}h left`
  return `${Math.floor(diff / 60_000)}m left`
}

function relAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

function ChallengeRow({
  c,
  currentUserId,
  last,
  onAccept,
  onDecline,
  onView,
}: {
  c: FriendChallenge
  currentUserId: string
  last: boolean
  onAccept: () => void
  onDecline: () => void
  onView: () => void
}) {
  const viewerStatus = deriveViewerStatus(c, currentUserId)
  const accent = STATUS_ACCENT[viewerStatus]
  const iAmChallenger = c.challengerId === currentUserId
  const otherName = iAmChallenger ? c.opponentUsername : c.challengerUsername

  const showAccept = viewerStatus === 'your-turn'
  const showDecline = viewerStatus === 'your-turn'
  const showReplay = viewerStatus === 'won' || viewerStatus === 'lost' || viewerStatus === 'draw'

  const myTimeMs = iAmChallenger ? c.challengerTimeMs : c.opponentTimeMs
  const myScore  = iAmChallenger ? c.challengerScore  : c.opponentScore
  const theirTimeMs = iAmChallenger ? c.opponentTimeMs : c.challengerTimeMs
  const theirScore  = iAmChallenger ? c.opponentScore  : c.challengerScore
  const hasResults = (myTimeMs || theirTimeMs)

  return (
    <div
      style={{
        padding: '14px 16px',
        borderBottom: last ? 'none' : '1px dashed var(--ink-3)',
        borderLeft: `4px solid ${accent}`,
        display: 'grid',
        gridTemplateColumns: '48px 1fr auto',
        gap: 14,
        alignItems: 'center',
      }}
    >
      <div
        style={{
          width: 44, height: 44,
          background: 'var(--ink-0)', color: 'var(--parch-0)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Pixelify Sans, monospace', fontSize: 16,
        }}
      >
        {otherName.slice(0, 2).toUpperCase() || '??'}
      </div>
      <div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 15 }}>{otherName}</span>
          <Badge variant={viewerStatus === 'won' ? 'moss' : viewerStatus === 'your-turn' ? 'ember' : 'dark'} style={{ fontSize: 8 }}>
            {STATUS_LABEL[viewerStatus]}
          </Badge>
        </div>
        <div style={{ fontSize: 13, marginBottom: 2 }}>{c.taskTitle}</div>
        <div
          className="font-silkscreen uppercase"
          style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.06em' }}
        >
          {diffLabel(c.taskDifficulty)} · {c.taskTopic || '—'} · sent {relAgo(c.createdAt)}
          {(c.status === 1 || c.status === 2) && (
            <span style={{ color: 'var(--rpg-danger, #a23a2a)' }}> · {timeUntil(c.deadlineAt)}</span>
          )}
        </div>
        {hasResults && (
          <div style={{ display: 'flex', gap: 12, marginTop: 6, fontFamily: 'Pixelify Sans, monospace', fontSize: 11 }}>
            <span>you · {myTimeMs ? `${(myTimeMs / 1000).toFixed(1)}s` : '—'} ({myScore ?? 0}/5)</span>
            <span style={{ color: 'var(--ink-2)' }}>
              {otherName} · {theirTimeMs ? `${(theirTimeMs / 1000).toFixed(1)}s` : '—'} ({theirScore ?? 0}/5)
            </span>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        {showAccept && (
          <RpgButton size="sm" variant="primary" onClick={onAccept}>
            Solve →
          </RpgButton>
        )}
        {showDecline && (
          <RpgButton size="sm" variant="ghost" onClick={onDecline}>
            Decline
          </RpgButton>
        )}
        {showReplay && (
          <RpgButton size="sm" variant="ghost" onClick={onView}>
            Replay
          </RpgButton>
        )}
        {(viewerStatus === 'pending-them' || viewerStatus === 'their-turn') && (
          <RpgButton size="sm" variant="ghost" disabled>
            Waiting
          </RpgButton>
        )}
      </div>
    </div>
  )
}

// ---------- Compose modal ----------

function ComposeChallengeModal({
  onClose,
  onSent,
}: {
  onClose: () => void
  onSent: () => void
}) {
  const [opponent, setOpponent] = useState('')
  const [taskTitle, setTaskTitle] = useState('Reverse an array')
  const [topic, setTopic] = useState(TOPICS[0])
  const [diff, setDiff] = useState<ChallengeDifficulty>(ChallengeDifficulty.MEDIUM)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const submit = async () => {
    if (!opponent.trim()) {
      setError('Pick an opponent')
      return
    }
    setSending(true)
    setError(null)
    try {
      await friendChallengeApi.send({
        opponentUsername: opponent.trim(),
        taskTitle: taskTitle.trim() || 'Training task',
        taskTopic: topic,
        taskDifficulty: diff,
        note,
      })
      onSent()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Failed to send challenge')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="rpg-modal-backdrop" onClick={onClose}>
      <div
        className="rpg-modal rpg-panel rpg-panel--nailed"
        style={{ padding: 28, maxWidth: 480 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <h2 className="font-display" style={{ fontSize: 22, margin: 0 }}>
            Send challenge
          </h2>
          <RpgButton size="sm" variant="ghost" onClick={onClose}>
            ✕
          </RpgButton>
        </div>

        <FieldGroup label="To friend (username)">
          <input
            value={opponent}
            onChange={(e) => setOpponent(e.target.value)}
            placeholder="lunarfox"
            style={textInputStyle}
          />
        </FieldGroup>

        <FieldGroup label="Task title">
          <input
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            style={textInputStyle}
          />
        </FieldGroup>

        <FieldGroup label="Topic">
          {TOPICS.map((t) => (
            <Chip key={t} active={topic === t} onClick={() => setTopic(t)}>
              {t}
            </Chip>
          ))}
        </FieldGroup>

        <FieldGroup label="Difficulty">
          {[ChallengeDifficulty.EASY, ChallengeDifficulty.MEDIUM, ChallengeDifficulty.HARD].map((d) => (
            <Chip key={d} active={diff === d} onClick={() => setDiff(d)}>
              {diffLabel(d)}
            </Chip>
          ))}
        </FieldGroup>

        <div style={{ marginBottom: 16 }}>
          <div
            className="font-silkscreen uppercase"
            style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.1em', marginBottom: 6 }}
          >
            Note (optional)
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="bet you can't beat my time…"
            rows={3}
            maxLength={400}
            style={{ ...textInputStyle, resize: 'vertical' as const }}
          />
        </div>

        <div
          style={{
            background: 'var(--parch-2)',
            border: '2px dashed var(--ink-3)',
            padding: 10,
            marginBottom: 16,
          }}
        >
          <div
            className="font-silkscreen uppercase"
            style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.1em', marginBottom: 4 }}
          >
            rules
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-1)', lineHeight: 1.5 }}>
            Both solve the same task. 48h window. Higher score + faster time wins. Winner earns +elo
            + 100 gold. Loser loses -10 elo.
          </div>
        </div>

        {error && (
          <div
            style={{
              color: 'var(--rpg-danger, #a23a2a)',
              fontSize: 12,
              marginBottom: 10,
              fontFamily: 'Pixelify Sans, monospace',
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <RpgButton size="sm" variant="ghost" onClick={onClose} disabled={sending}>
            Cancel
          </RpgButton>
          <RpgButton size="sm" variant="primary" onClick={() => void submit()} disabled={sending}>
            {sending ? 'Sending…' : 'Send · 48h'}
          </RpgButton>
        </div>
      </div>
    </div>
  )
}

const textInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  background: 'var(--parch-0)',
  border: '3px solid var(--ink-0)',
  fontFamily: 'Pixelify Sans, monospace',
  fontSize: 13,
  color: 'var(--ink-0)',
  outline: 'none',
  boxSizing: 'border-box',
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        className="font-silkscreen uppercase"
        style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.1em', marginBottom: 6 }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{children}</div>
    </div>
  )
}

function Chip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <span
      onClick={onClick}
      className={`rpg-tweak-chip ${active ? 'rpg-tweak-chip--on' : ''}`}
      style={{ cursor: 'pointer' }}
    >
      {children}
    </span>
  )
}
