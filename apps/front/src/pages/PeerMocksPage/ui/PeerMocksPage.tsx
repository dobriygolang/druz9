import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Panel, RpgButton, Badge, PageHeader } from '@/shared/ui/pixel'
import { addToast } from '@/shared/lib/toasts'
import {
  peerMockApi,
  SlotType,
  SlotLevel,
  SlotStatus,
  BookingStatus,
  type Slot,
  type Booking,
  type Reliability,
} from '@/features/PeerMock/api/peerMockApi'

const TYPE_LABEL: Record<SlotType, string> = {
  [SlotType.UNSPECIFIED]: '—',
  [SlotType.ALGO]: 'Algorithms',
  [SlotType.SYSTEM_DESIGN]: 'System design',
  [SlotType.BEHAVIORAL]: 'Behavioral',
  [SlotType.FULL]: 'Full combo',
}
const LEVEL_LABEL: Record<SlotLevel, string> = {
  [SlotLevel.UNSPECIFIED]: '—',
  [SlotLevel.JUNIOR]: 'Junior',
  [SlotLevel.MID]: 'Mid',
  [SlotLevel.SENIOR]: 'Senior',
}

const TIER_COLOR: Record<Reliability['tier'], string> = {
  unranked: 'var(--ink-2)',
  reliable: 'var(--moss-1)',
  featured: 'var(--ember-1)',
  verified: 'var(--r-legendary)',
}

function formatRange(iso: string, endIso: string): string {
  try {
    const s = new Date(iso)
    const e = new Date(endIso)
    const day = s.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
    const sHm = s.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    const eHm = e.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    return `${day} · ${sHm}–${eHm}`
  } catch {
    return iso
  }
}

type Tab = 'browse' | 'my-slots' | 'my-bookings'

export function PeerMocksPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('browse')

  const [slots, setSlots] = useState<Slot[]>([])
  const [mySlots, setMySlots] = useState<Slot[]>([])
  const [bookings, setBookings] = useState<{ asInterviewer: Booking[]; asInterviewee: Booking[] }>({
    asInterviewer: [],
    asInterviewee: [],
  })
  const [reliability, setReliability] = useState<Reliability | null>(null)
  const [typeFilter, setTypeFilter] = useState<SlotType>(SlotType.UNSPECIFIED)
  const [levelFilter, setLevelFilter] = useState<SlotLevel>(SlotLevel.UNSPECIFIED)
  const [createOpen, setCreateOpen] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const refresh = useCallback(() => {
    peerMockApi.listOpen({ type: typeFilter, level: levelFilter }).then(setSlots).catch(() => {})
    peerMockApi.listMine().then(setMySlots).catch(() => {})
    peerMockApi.listBookings().then(setBookings).catch(() => {})
    peerMockApi.getReliability().then(setReliability).catch(() => {})
  }, [typeFilter, levelFilter])

  useEffect(() => {
    refresh()
  }, [refresh])

  const bookSlot = async (slot: Slot) => {
    setBusyId(slot.id)
    try {
      await peerMockApi.book(slot.id)
      addToast({ kind: 'QUEST', title: 'Booked', body: `Slot with ${slot.interviewerName} is reserved`, icon: '✓', color: 'var(--moss-1)' })
      refresh()
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? 'Could not book the slot'
      addToast({ kind: 'QUEST', title: 'Booking failed', body: msg, icon: '!', color: 'var(--rpg-danger)' })
    } finally {
      setBusyId(null)
    }
  }

  const cancelSlot = async (slot: Slot) => {
    setBusyId(slot.id)
    try {
      await peerMockApi.cancelSlot(slot.id)
      refresh()
    } finally {
      setBusyId(null)
    }
  }

  const cancelBooking = async (b: Booking) => {
    setBusyId(b.id)
    try {
      const res = await peerMockApi.cancelBooking(b.id)
      if (res.reliabilityDelta < 0) {
        addToast({
          kind: 'QUEST',
          title: 'Cancelled — penalty applied',
          body: `Reliability ${res.reliabilityDelta}. Try to give at least 2 hours notice next time.`,
          icon: '!',
          color: 'var(--rpg-danger)',
        })
      }
      refresh()
    } finally {
      setBusyId(null)
    }
  }

  const header = (
    <PageHeader
      eyebrow="Peer mocks"
      title="Practice with real people"
      subtitle="Offer a slot when you're free to interview someone, or book one to be interviewed. No-shows cost reliability; good reviews boost it."
      right={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {reliability && (
            <span
              className="font-silkscreen uppercase"
              style={{
                fontSize: 10,
                letterSpacing: '0.1em',
                color: TIER_COLOR[reliability.tier],
              }}
              title={`Reliability score: ${reliability.score}/100`}
            >
              ● {reliability.tier} · {reliability.score}
            </span>
          )}
          <RpgButton size="sm" onClick={() => navigate('/interview')}>
            Back to hub
          </RpgButton>
          <RpgButton size="sm" variant="primary" onClick={() => setCreateOpen(true)}>
            + Offer a slot
          </RpgButton>
        </div>
      }
    />
  )

  const tabBar = (
    <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
      <RpgButton size="sm" variant={tab === 'browse' ? 'primary' : 'default'} onClick={() => setTab('browse')}>
        Browse slots
      </RpgButton>
      <RpgButton size="sm" variant={tab === 'my-bookings' ? 'primary' : 'default'} onClick={() => setTab('my-bookings')}>
        My bookings
      </RpgButton>
      <RpgButton size="sm" variant={tab === 'my-slots' ? 'primary' : 'default'} onClick={() => setTab('my-slots')}>
        My slots
      </RpgButton>
    </div>
  )

  return (
    <>
      {header}
      {tabBar}

      {tab === 'browse' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <span className="font-silkscreen uppercase" style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.1em', alignSelf: 'center' }}>
              type:
            </span>
            {([SlotType.UNSPECIFIED, SlotType.ALGO, SlotType.SYSTEM_DESIGN, SlotType.BEHAVIORAL, SlotType.FULL] as const).map((t) => (
              <span
                key={t}
                className={`rpg-tweak-chip ${t === typeFilter ? 'rpg-tweak-chip--on' : ''}`}
                onClick={() => setTypeFilter(t)}
                style={{ cursor: 'pointer' }}
              >
                {t === SlotType.UNSPECIFIED ? 'all' : TYPE_LABEL[t]}
              </span>
            ))}
            <span className="font-silkscreen uppercase" style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.1em', alignSelf: 'center', marginLeft: 16 }}>
              level:
            </span>
            {([SlotLevel.UNSPECIFIED, SlotLevel.JUNIOR, SlotLevel.MID, SlotLevel.SENIOR] as const).map((l) => (
              <span
                key={l}
                className={`rpg-tweak-chip ${l === levelFilter ? 'rpg-tweak-chip--on' : ''}`}
                onClick={() => setLevelFilter(l)}
                style={{ cursor: 'pointer' }}
              >
                {l === SlotLevel.UNSPECIFIED ? 'all' : LEVEL_LABEL[l]}
              </span>
            ))}
          </div>
          <Panel>
            {slots.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--ink-2)', fontSize: 13 }}>
                No open slots right now. Be the first to offer one — the community is counting on you.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {slots.map((s) => (
                  <SlotCard
                    key={s.id}
                    slot={s}
                    busy={busyId === s.id}
                    onBook={() => bookSlot(s)}
                  />
                ))}
              </div>
            )}
          </Panel>
        </>
      )}

      {tab === 'my-slots' && (
        <Panel>
          {mySlots.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--ink-2)', fontSize: 13 }}>
              You haven't offered any slots yet. Hit "Offer a slot" at the top to create one.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {mySlots.map((s) => (
                <SlotCard
                  key={s.id}
                  slot={s}
                  busy={busyId === s.id}
                  ownerView
                  onCancel={() => cancelSlot(s)}
                />
              ))}
            </div>
          )}
        </Panel>
      )}

      {tab === 'my-bookings' && (
        <div style={{ display: 'grid', gap: 18 }}>
          <Panel>
            <h3 className="font-display" style={{ fontSize: 16, marginBottom: 12 }}>
              I'm interviewing ({bookings.asInterviewer.length})
            </h3>
            {bookings.asInterviewer.length === 0 ? (
              <div style={{ padding: 8, color: 'var(--ink-2)', fontSize: 12 }}>
                No one has booked your slots yet.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {bookings.asInterviewer.map((b) => (
                  <BookingRow key={b.id} booking={b} viewerRole="interviewer" busy={busyId === b.id} onCancel={() => cancelBooking(b)} />
                ))}
              </div>
            )}
          </Panel>
          <Panel>
            <h3 className="font-display" style={{ fontSize: 16, marginBottom: 12 }}>
              I'm being interviewed ({bookings.asInterviewee.length})
            </h3>
            {bookings.asInterviewee.length === 0 ? (
              <div style={{ padding: 8, color: 'var(--ink-2)', fontSize: 12 }}>
                You haven't booked any slots yet. Browse the tab above to find one.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {bookings.asInterviewee.map((b) => (
                  <BookingRow key={b.id} booking={b} viewerRole="interviewee" busy={busyId === b.id} onCancel={() => cancelBooking(b)} />
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}

      {createOpen && (
        <CreateSlotModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false)
            setTab('my-slots')
            refresh()
          }}
        />
      )}
    </>
  )
}

function SlotCard({
  slot,
  busy,
  ownerView,
  onBook,
  onCancel,
}: {
  slot: Slot
  busy: boolean
  ownerView?: boolean
  onBook?: () => void
  onCancel?: () => void
}) {
  return (
    <div
      style={{
        padding: 12,
        border: '3px solid var(--ink-0)',
        background: 'var(--parch-0)',
        boxShadow: '3px 3px 0 var(--ink-0)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 15 }}>
          {ownerView ? 'Your slot' : slot.interviewerName}
        </div>
        <span className="font-silkscreen uppercase" style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em' }}>
          rel {slot.interviewerReliability}
        </span>
      </div>
      <div className="font-silkscreen uppercase" style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.08em' }}>
        {formatRange(slot.startsAt, slot.endsAt)}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <Badge>{TYPE_LABEL[slot.type]}</Badge>
        <Badge variant="dark">{LEVEL_LABEL[slot.level]}</Badge>
        {slot.priceGold > 0 && <Badge variant="ember">{slot.priceGold} gold</Badge>}
      </div>
      {slot.note && <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>{slot.note}</div>}
      {/* Status chip tells the owner why Cancel might be disabled —
          previously once a slot was booked or cancelled, the Cancel
          button was still live and hit a 409 SLOT_NOT_OPEN toast. */}
      {ownerView && slot.status !== SlotStatus.OPEN && (
        <Badge variant={slot.status === SlotStatus.BOOKED ? 'ember' : 'dark'}>
          {slot.status === SlotStatus.BOOKED ? 'booked' : slot.status === SlotStatus.COMPLETED ? 'completed' : 'cancelled'}
        </Badge>
      )}
      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        {onBook && (
          <RpgButton size="sm" variant="primary" disabled={busy} onClick={onBook}>
            {busy ? 'Booking…' : 'Book'}
          </RpgButton>
        )}
        {onCancel && slot.status === SlotStatus.OPEN && (
          <RpgButton size="sm" disabled={busy} onClick={onCancel}>
            {busy ? '…' : 'Cancel slot'}
          </RpgButton>
        )}
      </div>
    </div>
  )
}

function BookingRow({
  booking,
  viewerRole,
  busy,
  onCancel,
}: {
  booking: Booking
  viewerRole: 'interviewer' | 'interviewee'
  busy: boolean
  onCancel: () => void
}) {
  const otherName = viewerRole === 'interviewer' ? booking.intervieweeName : booking.interviewerName
  const active = booking.status === BookingStatus.SCHEDULED
  const completed = booking.status === BookingStatus.COMPLETED
  const [coachOpen, setCoachOpen] = useState(false)
  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        padding: 10,
        border: '2px solid var(--ink-0)',
        background: active ? 'var(--parch-0)' : 'var(--parch-2)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 13 }}>{otherName}</div>
        <div className="font-silkscreen uppercase" style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em' }}>
          {formatRange(booking.startsAt, booking.endsAt)}
          {booking.priceGold > 0 ? ` · ${booking.priceGold} gold` : ''}
        </div>
      </div>
      <Badge variant={active ? 'default' : 'dark'}>{bookingStatusLabel(booking.status)}</Badge>
      {active && (
        <RpgButton size="sm" disabled={busy} onClick={onCancel}>
          Cancel
        </RpgButton>
      )}
      {completed && (
        <RpgButton size="sm" variant="primary" onClick={() => setCoachOpen(true)}>AI Coach</RpgButton>
      )}
      {coachOpen && <CoachReportModal bookingId={booking.id} onClose={() => setCoachOpen(false)} />}
    </div>
  )
}

function CoachReportModal({ bookingId, onClose }: { bookingId: string; onClose: () => void }) {
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [rep, setRep] = useState<import('@/features/PeerMock/api/peerMockApi').CoachReport | null>(null)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    peerMockApi.getCoachReport(bookingId).then((r) => {
      if (!cancelled) { setRep(r); setLoading(false) }
    }).catch((e) => {
      if (!cancelled) { setErr(e instanceof Error ? e.message : 'failed to load'); setLoading(false) }
    })
    return () => { cancelled = true }
  }, [bookingId])
  return (
    <div className="rpg-modal-backdrop" onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'grid', placeItems: 'center', zIndex: 1000 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520, width: '92%' }}>
        <Panel style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <h2 className="font-display" style={{ fontSize: 18 }}>AI Coach Report</h2>
            <RpgButton size="sm" variant="ghost" onClick={onClose}>Close</RpgButton>
          </div>
          {loading && <div>Generating…</div>}
          {err && <div style={{ color: '#c85050' }}>{err}</div>}
          {rep && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <Badge variant="default">Score {rep.overallScore}/100</Badge>
                <Badge variant="dark">Filler words: {rep.fillerWordHits}</Badge>
              </div>
              {rep.strengths && (
                <div>
                  <div className="font-silkscreen uppercase" style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.1em' }}>Strengths</div>
                  <div>{rep.strengths}</div>
                </div>
              )}
              {rep.areasToRevisit && (
                <div>
                  <div className="font-silkscreen uppercase" style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.1em' }}>Areas to revisit</div>
                  <div>{rep.areasToRevisit}</div>
                </div>
              )}
              {rep.recommendedFocus.length > 0 && (
                <div>
                  <div className="font-silkscreen uppercase" style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.1em' }}>Recommended focus</div>
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {rep.recommendedFocus.map((t) => <li key={t}>{t}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}

function bookingStatusLabel(s: BookingStatus): string {
  switch (s) {
    case BookingStatus.SCHEDULED: return 'scheduled'
    case BookingStatus.IN_PROGRESS: return 'in progress'
    case BookingStatus.COMPLETED: return 'completed'
    case BookingStatus.CANCELLED_BY_BOOKER: return 'cancelled by booker'
    case BookingStatus.CANCELLED_BY_OFFERER: return 'cancelled by offerer'
    case BookingStatus.NO_SHOW_BOOKER: return 'booker no-show'
    case BookingStatus.NO_SHOW_OFFERER: return 'offerer no-show'
    default: return 'unknown'
  }
}

function CreateSlotModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [date, setDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setHours(18, 0, 0, 0)
    return d.toISOString().slice(0, 16) // "YYYY-MM-DDTHH:MM"
  })
  const [durationMin, setDurationMin] = useState(60)
  const [type, setType] = useState<SlotType>(SlotType.ALGO)
  const [level, setLevel] = useState<SlotLevel>(SlotLevel.MID)
  const [priceGold, setPriceGold] = useState(0)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const startsAt = useMemo(() => new Date(date), [date])
  const endsAt = useMemo(() => new Date(startsAt.getTime() + durationMin * 60_000), [startsAt, durationMin])

  const submit = async () => {
    if (startsAt.getTime() < Date.now() + 30 * 60_000) {
      setError('Slot must start at least 30 minutes from now')
      return
    }
    setBusy(true)
    setError('')
    try {
      await peerMockApi.createSlot({
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        type, level, priceGold, note,
      })
      onCreated()
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Could not create slot')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rpg-modal-backdrop" onClick={onClose}>
      <div
        className="rpg-panel rpg-panel--nailed"
        style={{ padding: 24, maxWidth: 500, width: '92%', maxHeight: '90vh', overflow: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display" style={{ fontSize: 20, marginBottom: 12 }}>Offer a mock interview slot</h3>
        <div style={{ color: 'var(--ink-2)', fontSize: 13, marginBottom: 16 }}>
          When you're free to conduct an interview, put it here and others will book in.
        </div>

        <Field label="Start">
          <input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={inputStyle}
          />
        </Field>

        <Field label="Duration">
          <div style={{ display: 'flex', gap: 6 }}>
            {[30, 45, 60, 90, 120].map((m) => (
              <span
                key={m}
                className={`rpg-tweak-chip ${durationMin === m ? 'rpg-tweak-chip--on' : ''}`}
                onClick={() => setDurationMin(m)}
                style={{ cursor: 'pointer' }}
              >
                {m}m
              </span>
            ))}
          </div>
        </Field>

        <Field label="Type">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[SlotType.ALGO, SlotType.SYSTEM_DESIGN, SlotType.BEHAVIORAL, SlotType.FULL].map((t) => (
              <span
                key={t}
                className={`rpg-tweak-chip ${type === t ? 'rpg-tweak-chip--on' : ''}`}
                onClick={() => setType(t)}
                style={{ cursor: 'pointer' }}
              >
                {TYPE_LABEL[t]}
              </span>
            ))}
          </div>
        </Field>

        <Field label="Level">
          <div style={{ display: 'flex', gap: 6 }}>
            {[SlotLevel.JUNIOR, SlotLevel.MID, SlotLevel.SENIOR].map((l) => (
              <span
                key={l}
                className={`rpg-tweak-chip ${level === l ? 'rpg-tweak-chip--on' : ''}`}
                onClick={() => setLevel(l)}
                style={{ cursor: 'pointer' }}
              >
                {LEVEL_LABEL[l]}
              </span>
            ))}
          </div>
        </Field>

        <Field label="Price (gold, optional)">
          <input
            type="number"
            min={0}
            max={5000}
            step={50}
            value={priceGold}
            onChange={(e) => setPriceGold(Math.max(0, Number(e.target.value) || 0))}
            style={inputStyle}
          />
        </Field>

        <Field label="Notes (optional)">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="focus areas, company context, language preferences…"
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </Field>

        {error && <div style={{ color: 'var(--rpg-danger)', fontSize: 12, marginBottom: 10 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <RpgButton variant="primary" disabled={busy} onClick={submit}>
            {busy ? 'Creating…' : 'Create slot'}
          </RpgButton>
          <RpgButton onClick={onClose}>Cancel</RpgButton>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        className="font-silkscreen uppercase"
        style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.1em', marginBottom: 4 }}
      >
        {label}
      </div>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '3px solid var(--ink-0)',
  background: 'var(--parch-2)',
  fontFamily: 'IBM Plex Sans, system-ui',
  fontSize: 13,
  color: 'var(--ink-0)',
  outline: 'none',
}
