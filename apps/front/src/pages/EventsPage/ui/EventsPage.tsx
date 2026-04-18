import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Panel, RpgButton, Badge, Bar, PageHeader } from '@/shared/ui/pixel'
import { Trophy, Sword, Banner, Statue, Chest, SpiritOrb } from '@/shared/ui/sprites'
import { eventApi } from '@/features/Event/api/eventApi'
import type { Event as ApiEvent } from '@/features/Event/api/eventApi'
import { useActiveSeason } from '@/features/Hub/api/useActiveSeason'

type EventType = 'all' | 'seasonal' | 'tournament' | 'guild' | 'weekly' | 'lecture' | 'raid'

interface UIEvent {
  id: string
  t: string
  type: Exclude<EventType, 'all'>
  d: string
  meta: string
  hero: string
  desc: string
  rewards: string[]
  hot?: boolean
  progress: number
}

// Map a backend Event to the UI shape. Since the backend has no "event type"
// taxonomy, we infer from guildId/title keywords. Dates use the scheduled
// timestamp; countdown is computed relative to now.
function toUIEvent(e: ApiEvent): UIEvent {
  const t = e.title || 'Untitled event'
  let type: Exclude<EventType, 'all'> = 'seasonal'
  if (e.guildId) type = 'guild'
  else if (/tourney|tournament|cup/i.test(t)) type = 'tournament'
  else if (/lecture|talk|stream/i.test(t)) type = 'lecture'
  else if (/raid|dungeon/i.test(t)) type = 'raid'
  else if (/weekly|week/i.test(t)) type = 'weekly'

  const dateLabel = e.scheduledAt
    ? new Date(e.scheduledAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : ''

  const color = type === 'tournament' ? '#a23a2a'
              : type === 'guild'      ? '#3b2a1e'
              : type === 'lecture'    ? '#3d6149'
              : type === 'raid'       ? '#4a2a5a'
              : type === 'weekly'     ? '#dcc690'
              : '#b8692a'

  return {
    id: e.id,
    t,
    type,
    d: dateLabel,
    meta: [e.placeLabel, e.region].filter(Boolean).join(' · ') || `${e.participantCount} participants`,
    hero: color,
    desc: e.description || '',
    rewards: [], // Backend event has no rewards field yet; leave empty.
    hot: e.isJoined,
    progress: 0,
  }
}

function eventIcon(type: Event['type']) {
  if (type === 'tournament') return <Trophy scale={3} tier="gold" />
  if (type === 'seasonal') return <Sword scale={3} />
  if (type === 'guild') return <Banner scale={3} color="#3d6149" />
  if (type === 'lecture') return <Statue scale={3} color="#dcc690" />
  if (type === 'raid') return <Chest scale={3} />
  return <SpiritOrb scale={3} />
}

export function EventsPage() {
  const { t } = useTranslation()
  const season = useActiveSeason()
  const [cat, setCat] = useState<EventType>('all')
  const [events, setEvents] = useState<UIEvent[]>([])
  const [loading, setLoading] = useState(true)
  // Calendar strip header lets the player flip months without persistence —
  // offset is in months from "now". Zero shows the current month.
  const [monthOffset, setMonthOffset] = useState(0)
  const monthDate = useMemo(() => {
    const d = new Date()
    d.setMonth(d.getMonth() + monthOffset)
    return d
  }, [monthOffset])
  const monthLabel = monthDate.toLocaleString(undefined, { month: 'long', year: 'numeric' })

  useEffect(() => {
    let cancelled = false
    eventApi
      .listEvents({ limit: 20 })
      .then((r) => {
        if (cancelled) return
        setEvents(r.events.map(toUIEvent))
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const filtered = cat === 'all' ? events : events.filter((e) => e.type === cat)

  const CATS: Array<[EventType, string]> = [
    ['all', t('eventsHub.cat.all')],
    ['seasonal', t('eventsHub.cat.seasonal')],
    ['tournament', t('eventsHub.cat.tournament')],
    ['guild', t('eventsHub.cat.guild')],
    ['weekly', t('eventsHub.cat.weekly')],
    ['lecture', t('eventsHub.cat.lecture')],
    ['raid', t('eventsHub.cat.raid')],
  ]

  return (
    <>
      <PageHeader
        eyebrow={t('eventsHub.eyebrow')}
        title={t('eventsHub.title')}
        subtitle={t('eventsHub.subtitle')}
        right={
          <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
            <Badge>{t('eventsHub.activeCount', { count: events.filter((e) => !e.d || new Date(e.d) > new Date(Date.now() - 7 * 86400_000)).length, defaultValue: `${events.length} active` })}</Badge>
            {season && (
              <span
                className="font-silkscreen uppercase"
                style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.1em' }}
              >
                {`${t('eventsHub.season', { defaultValue: 'season' })} ${season.roman}`}
              </span>
            )}
          </div>
        }
      />

      {/* Calendar strip */}
      <Panel style={{ marginBottom: 14 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <h3 className="font-display" style={{ fontSize: 17 }}>
            {monthLabel}
          </h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <RpgButton size="sm" onClick={() => setMonthOffset((m) => m - 1)}>
              {t('eventsHub.prev')}
            </RpgButton>
            <RpgButton size="sm" onClick={() => setMonthOffset((m) => m + 1)}>
              {t('eventsHub.next')}
            </RpgButton>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {[t('eventsHub.days.mon'), t('eventsHub.days.tue'), t('eventsHub.days.wed'), t('eventsHub.days.thu'), t('eventsHub.days.fri'), t('eventsHub.days.sat'), t('eventsHub.days.sun')].map((d) => (
            <div
              key={d}
              className="font-silkscreen uppercase"
              style={{
                fontSize: 9,
                textAlign: 'center',
                padding: 4,
                color: 'var(--ink-2)',
                letterSpacing: '0.08em',
              }}
            >
              {d}
            </div>
          ))}
          {Array.from({ length: 31 }).map((_, i) => {
            const day = i + 1
            const evts: Array<{ c: string }> = []
            if (day >= 12 && day <= 26) evts.push({ c: 'var(--ember-1)' })
            if (day === 19) evts.push({ c: 'var(--rpg-danger, #a23a2a)' })
            if (day === 18) evts.push({ c: 'var(--moss-1)' })
            if (day % 7 === 1) evts.push({ c: 'var(--parch-3)' })
            const today = day === 15
            return (
              <div
                key={day}
                style={{
                  aspectRatio: '1.3',
                  border: '2px solid var(--ink-0)',
                  background: today ? 'var(--ember-1)' : 'var(--parch-0)',
                  color: today ? 'var(--parch-0)' : 'var(--ink-0)',
                  padding: 4,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  position: 'relative',
                }}
              >
                <span
                  className="font-silkscreen uppercase"
                  style={{ fontSize: 9, letterSpacing: '0.08em' }}
                >
                  {day}
                </span>
                <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {evts.map((e, j) => (
                    <div
                      key={j}
                      style={{
                        width: 6,
                        height: 6,
                        background: e.c,
                        border: '1px solid var(--ink-0)',
                      }}
                    />
                  ))}
                </div>
                {today && (
                  <div
                    className="font-silkscreen uppercase"
                    style={{
                      fontSize: 8,
                      position: 'absolute',
                      bottom: 2,
                      right: 4,
                      letterSpacing: '0.08em',
                    }}
                  >
                    {t('eventsHub.today')}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Panel>

      <div className="rpg-tabs">
        {CATS.map(([id, t]) => (
          <div
            key={id}
            className={`rpg-tab ${cat === id ? 'rpg-tab--active' : ''}`}
            onClick={() => setCat(id)}
          >
            {t}
          </div>
        ))}
      </div>

      {loading && events.length === 0 && (
        <Panel style={{ marginBottom: 14 }}>
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--ink-2)' }}>Loading events…</div>
        </Panel>
      )}
      {!loading && filtered.length === 0 && (
        <Panel>
          <div style={{ padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>No events in this category yet.</div>
          </div>
        </Panel>
      )}

      <div className="rpg-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {filtered.map((e) => (
          <Panel
            key={e.id}
            nailed
            style={{ padding: 0, overflow: 'hidden', position: 'relative' }}
          >
            {e.hot && (
              <Badge
                variant="ember"
                style={{ position: 'absolute', top: 10, right: 10, zIndex: 2 }}
              >
                live now
              </Badge>
            )}
            <div
              style={{
                height: 120,
                background: `linear-gradient(180deg, ${e.hero} 0%, #1a140e 100%)`,
                position: 'relative',
                display: 'flex',
                alignItems: 'flex-end',
                padding: 14,
                borderBottom: '3px solid var(--ink-0)',
              }}
            >
              <div style={{ position: 'absolute', right: 20, top: 14 }}>{eventIcon(e.type)}</div>
              <div>
                <div
                  className="font-silkscreen uppercase"
                  style={{
                    color: 'var(--parch-2)',
                    fontSize: 9,
                    letterSpacing: '0.08em',
                    marginBottom: 4,
                  }}
                >
                  {e.type.toUpperCase()} · {e.d}
                </div>
                <div
                  style={{
                    fontFamily: 'Pixelify Sans, monospace',
                    fontSize: 22,
                    color: 'var(--parch-0)',
                  }}
                >
                  {e.t}
                </div>
              </div>
            </div>
            <div style={{ padding: 14 }}>
              <div
                className="font-silkscreen uppercase"
                style={{
                  fontSize: 9,
                  color: 'var(--ink-2)',
                  letterSpacing: '0.08em',
                  marginBottom: 8,
                }}
              >
                {e.meta}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 12 }}>{e.desc}</div>
              {e.progress > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}
                  >
                    <span
                      className="font-silkscreen uppercase"
                      style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
                    >
                      {t('eventsHub.yourProgress')}
                    </span>
                    <span
                      className="font-silkscreen uppercase"
                      style={{ fontSize: 9, color: 'var(--ember-1)', letterSpacing: '0.08em' }}
                    >
                      {Math.round(e.progress * 100)}%
                    </span>
                  </div>
                  <Bar value={e.progress * 100} />
                </div>
              )}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {e.rewards.map((r) => (
                  <Badge key={r} variant="ember">
                    {r}
                  </Badge>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <RpgButton size="sm" variant="primary">
                  {e.progress > 0 ? t('eventsHub.continue') : t('eventsHub.join')}
                </RpgButton>
                <RpgButton size="sm">{t('eventsHub.details')}</RpgButton>
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </>
  )
}
