import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Panel, RpgButton, Badge, PageHeader } from '@/shared/ui/pixel'
import {
  duelReplayApi,
  EventKind,
  type ReplayEvent,
  type ReplaySummary,
} from '@/features/DuelReplay'

function eventColor(k: EventKind): string {
  switch (k) {
    case EventKind.SUBMIT_PASS: return 'var(--moss-1)'
    case EventKind.SUBMIT_FAIL: return 'var(--rpg-danger, #a23a2a)'
    case EventKind.RUN:         return 'var(--ember-1)'
    case EventKind.HINT:        return 'var(--r-legendary)'
    case EventKind.MILESTONE:   return 'var(--r-epic)'
    default:                    return 'var(--ink-2)'
  }
}

function fmtTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) s = 0
  const m = Math.floor(s / 60)
  const rest = Math.floor(s % 60)
  return `${m.toString().padStart(2, '0')}:${rest.toString().padStart(2, '0')}`
}

// Compute "lines written so far" at timestamp t by looking at the last
// event <= t that had a lines_count set.
function linesAt(events: ReplayEvent[], tMs: number): number {
  let last = 0
  for (const e of events) {
    if (e.tMs <= tMs && e.linesCount > 0) last = e.linesCount
    else if (e.tMs > tMs) break
  }
  return last
}

export function DuelReplayPage() {
  const navigate = useNavigate()
  const { id: replayIdParam } = useParams<{ id?: string }>()

  const [summary, setSummary] = useState<ReplaySummary | null>(null)
  const [events, setEvents] = useState<ReplayEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [tSec, setTSec] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(4)
  const rafRef = useRef<number | null>(null)
  const lastTickRef = useRef<number>(0)

  // Load the replay (or pick the user's most recent one when no id provided).
  useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
        setLoading(true)
        setError(null)
        if (replayIdParam) {
          const r = await duelReplayApi.getReplay(replayIdParam)
          if (cancelled) return
          setSummary(r.summary)
          setEvents(r.events)
        } else {
          const list = await duelReplayApi.listMine({ limit: 1 })
          if (cancelled) return
          if (list.replays.length === 0) {
            setError('No replays yet — play a duel first.')
            return
          }
          const r = await duelReplayApi.getReplay(list.replays[0].id)
          if (cancelled) return
          setSummary(r.summary)
          setEvents(r.events)
        }
      } catch (e: unknown) {
        const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        setError(msg ?? 'Failed to load replay')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()
    return () => { cancelled = true }
  }, [replayIdParam])

  const durationSec = (summary?.durationMs ?? 0) / 1000

  // Playback loop driven by rAF.
  useEffect(() => {
    if (!playing || durationSec <= 0) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      return
    }
    lastTickRef.current = performance.now()
    const loop = (now: number) => {
      const dt = (now - lastTickRef.current) / 1000
      lastTickRef.current = now
      setTSec((prev) => {
        const next = prev + dt * speed
        if (next >= durationSec) {
          setPlaying(false)
          return durationSec
        }
        return next
      })
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [playing, speed, durationSec])

  const tMs = tSec * 1000

  const { p1Events, p2Events } = useMemo(() => {
    if (!summary) return { p1Events: [] as ReplayEvent[], p2Events: [] as ReplayEvent[] }
    return {
      p1Events: events.filter((e) => e.userId === summary.player1Id),
      p2Events: events.filter((e) => e.userId === summary.player2Id),
    }
  }, [events, summary])

  if (loading) {
    return (
      <>
        <PageHeader eyebrow="Coliseum · replay" title="Loading…" />
        <Panel><EmptyState label="Loading replay…" /></Panel>
      </>
    )
  }

  if (error || !summary) {
    return (
      <>
        <PageHeader
          eyebrow="Coliseum · replay"
          title="Replay unavailable"
          right={<RpgButton size="sm" variant="ghost" onClick={() => navigate('/arena')}>← Arena</RpgButton>}
        />
        <Panel><EmptyState label={error ?? 'Replay not found'} /></Panel>
      </>
    )
  }

  const p1Lines = linesAt(p1Events, tMs)
  const p2Lines = linesAt(p2Events, tMs)
  const p1Won = summary.winnerId === summary.player1Id
  const p2Won = summary.winnerId === summary.player2Id

  return (
    <>
      <PageHeader
        eyebrow="Coliseum · replay"
        title={`${summary.taskTitle}`}
        subtitle={`${summary.player1Username} vs ${summary.player2Username} · ${fmtTime(durationSec)} · ${resultLabel(summary)}`}
        right={
          <RpgButton size="sm" variant="ghost" onClick={() => navigate('/arena')}>
            ← Arena
          </RpgButton>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
        <PlayerPanel name={summary.player1Username} lines={p1Lines} won={p1Won} />
        <PlayerPanel name={summary.player2Username} lines={p2Lines} won={p2Won} />
      </div>

      {/* Scrubber */}
      <Panel style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <RpgButton
            size="sm"
            variant={playing ? 'default' : 'primary'}
            onClick={() => setPlaying((v) => !v)}
          >
            {playing ? '❚❚ Pause' : '▶ Play'}
          </RpgButton>
          <RpgButton
            size="sm"
            variant="ghost"
            onClick={() => {
              setTSec(0)
              setPlaying(false)
            }}
          >
            ↺ Reset
          </RpgButton>
          <div style={{ display: 'flex', gap: 4 }}>
            {[1, 2, 4, 8].map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className="font-silkscreen uppercase"
                style={{
                  padding: '4px 8px',
                  fontSize: 9,
                  letterSpacing: '0.08em',
                  border: '2px solid var(--ink-0)',
                  background: speed === s ? 'var(--ember-1)' : 'var(--parch-2)',
                  color: speed === s ? 'var(--parch-0)' : 'var(--ink-0)',
                  cursor: 'pointer',
                }}
              >
                {s}x
              </button>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <span style={{ fontFamily: 'Pixelify Sans, Unbounded, monospace', fontSize: 18, color: 'var(--ember-1)' }}>
            {fmtTime(tSec)} / {fmtTime(durationSec)}
          </span>
        </div>

        <div style={{ position: 'relative', padding: '32px 0 24px' }}>
          <div
            style={{
              position: 'relative',
              height: 6,
              background: 'var(--parch-2)',
              border: '2px solid var(--ink-0)',
              boxShadow: 'inset 1px 1px 0 var(--parch-3)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                width: durationSec > 0 ? `${(tSec / durationSec) * 100}%` : '0%',
                background: 'var(--ember-1)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: -6,
                left: durationSec > 0 ? `${(tSec / durationSec) * 100}%` : '0%',
                width: 4,
                height: 18,
                background: 'var(--ink-0)',
                transform: 'translateX(-50%)',
                boxShadow: '2px 2px 0 var(--ember-1)',
              }}
            />
          </div>

          <EventMarkers events={p1Events} durationMs={summary.durationMs} side="top" />
          <EventMarkers events={p2Events} durationMs={summary.durationMs} side="bottom" />

          <input
            type="range"
            min={0}
            max={Math.max(1, Math.floor(durationSec))}
            step={1}
            value={Math.floor(tSec)}
            onChange={(e) => {
              setTSec(Number(e.target.value))
              setPlaying(false)
            }}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              opacity: 0,
              cursor: 'pointer',
              height: '100%',
            }}
          />
        </div>

        <div
          style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
          className="font-silkscreen uppercase"
        >
          <span>00:00 · start</span>
          <span>{fmtTime(durationSec / 2)} · mid</span>
          <span>{fmtTime(durationSec)} · end</span>
        </div>
      </Panel>

      {/* Event log */}
      <Panel>
        <h3 className="font-display" style={{ fontSize: 17, marginBottom: 10 }}>
          Timeline
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <EventLog title={summary.player1Username} events={p1Events} currentMs={tMs} />
          <EventLog title={summary.player2Username} events={p2Events} currentMs={tMs} />
        </div>
      </Panel>
    </>
  )
}

function resultLabel(s: ReplaySummary): string {
  if (!s.winnerId) return 'draw'
  if (s.winnerId === s.player1Id) return `${s.player1Username} WIN`
  if (s.winnerId === s.player2Id) return `${s.player2Username} WIN`
  return '—'
}

function EmptyState({ label }: { label: string }) {
  return <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-2)', fontSize: 14 }}>{label}</div>
}

function PlayerPanel({ name, lines, won }: { name: string; lines: number; won: boolean }) {
  return (
    <Panel variant={won ? 'default' : 'recessed'}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <div style={{ fontFamily: 'Pixelify Sans, Unbounded, monospace', fontSize: 20 }}>{name}</div>
        </div>
        {won && <Badge variant="moss">winner</Badge>}
      </div>
      <div className="rpg-stat-box">
        <div
          className="font-silkscreen uppercase"
          style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
        >
          lines written
        </div>
        <div style={{ fontFamily: 'Pixelify Sans, Unbounded, monospace', fontSize: 28, color: 'var(--ember-1)', lineHeight: 1 }}>
          {lines}
        </div>
      </div>
    </Panel>
  )
}

function EventMarkers({
  events,
  durationMs,
  side,
}: {
  events: ReplayEvent[]
  durationMs: number
  side: 'top' | 'bottom'
}) {
  if (durationMs <= 0) return null
  return (
    <>
      {events
        .filter((e) => e.kind !== EventKind.KEYSTROKE)
        .map((e) => (
          <div
            key={e.id}
            title={`${fmtTime(e.tMs / 1000)} · ${e.label || kindName(e.kind)}`}
            style={{
              position: 'absolute',
              left: `${(e.tMs / durationMs) * 100}%`,
              top: side === 'top' ? 10 : undefined,
              bottom: side === 'bottom' ? 10 : undefined,
              width: 8,
              height: 8,
              background: eventColor(e.kind),
              border: '2px solid var(--ink-0)',
              transform: 'translateX(-50%)',
              pointerEvents: 'none',
            }}
          />
        ))}
    </>
  )
}

function EventLog({
  title,
  events,
  currentMs,
}: {
  title: string
  events: ReplayEvent[]
  currentMs: number
}) {
  const shown = events.filter((e) => e.kind !== EventKind.KEYSTROKE && e.tMs <= currentMs)
  return (
    <div>
      <div
        className="font-silkscreen uppercase"
        style={{ fontSize: 9, color: 'var(--ember-1)', letterSpacing: '0.1em', marginBottom: 8 }}
      >
        · {title} ·
      </div>
      {shown.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--ink-3)', padding: 8 }}>no events yet…</div>
      ) : (
        shown.map((e) => (
          <div
            key={e.id}
            style={{
              display: 'flex',
              gap: 10,
              padding: '6px 10px',
              marginBottom: 4,
              background: 'var(--parch-2)',
              border: '2px solid var(--ink-0)',
              borderLeft: `4px solid ${eventColor(e.kind)}`,
            }}
          >
            <span
              className="font-silkscreen uppercase"
              style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.06em', width: 48 }}
            >
              {fmtTime(e.tMs / 1000)}
            </span>
            <span style={{ fontSize: 12, fontFamily: 'Pixelify Sans, Unbounded, monospace' }}>
              {e.label || kindName(e.kind)}
            </span>
          </div>
        ))
      )}
    </div>
  )
}

function kindName(k: EventKind): string {
  switch (k) {
    case EventKind.KEYSTROKE: return 'keystroke'
    case EventKind.RUN: return 'run'
    case EventKind.SUBMIT_PASS: return 'submit · pass'
    case EventKind.SUBMIT_FAIL: return 'submit · fail'
    case EventKind.HINT: return 'hint'
    case EventKind.MILESTONE: return 'milestone'
    default: return '—'
  }
}
