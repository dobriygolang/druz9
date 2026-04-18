import { useEffect, useState } from 'react'
import { Panel, RpgButton, Bar, Badge, PageHeader } from '@/shared/ui/pixel'
import { Fireplace, Fireflies } from '@/shared/ui/sprites'
import { podcastApi } from '@/features/Podcast/api/podcastApi'
import type { Podcast } from '@/entities/Podcast/model/types'

type Tab = 'featured' | 'series' | 'history' | 'saved'

interface Episode {
  id: string
  t: string
  h: string
  d: string
  c: string
  tags: string[]
  heard: boolean
  ep: number
}

// Deterministic-per-title accent color; cycles through our pixel palette.
const PALETTE = ['#3d6149', '#b8692a', '#a23a2a', '#3b6a8f', '#7a4a8f', '#4a2a5a']
function pickColor(title: string, i: number): string {
  let h = i
  for (const c of title) h = (h * 31 + c.charCodeAt(0)) | 0
  return PALETTE[Math.abs(h) % PALETTE.length]
}

function toEpisode(p: Podcast, i: number): Episode {
  const mins = Math.max(1, Math.round(p.durationSeconds / 60))
  return {
    id: p.id,
    t: p.title,
    h: p.authorName || 'druz9 mentor',
    d: `${mins} min`,
    c: pickColor(p.title, i),
    tags: [],
    heard: false,
    ep: p.listensCount || i + 1,
  }
}

const SERIES: Array<[string, number, string]> = [
  ["Algorithmist's Codex", 24, '#3d6149'],
  ['Systems Scrolls', 18, '#b8692a'],
  ['Guild Chronicles', 12, '#a23a2a'],
  ['Career Trail', 30, '#3b6a8f'],
]

const QUEUE: Array<[string, string, string]> = [
  ['up next', 'Rituals of the Mock Interview', '38m'],
  ['queued', 'Why the Ember Bearers fell', '61m'],
  ['queued', 'Dungeons & Databases', '44m'],
  ['queued', 'Scrolls of Concurrency', '28m'],
]

export function PodcastsPage() {
  const [tab, setTab] = useState<Tab>('featured')
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [totalCatalog, setTotalCatalog] = useState(0)
  const [playing, setPlaying] = useState<{ title: string; host: string; ep: string; pos: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    podcastApi
      .list({ limit: 40, offset: 0 })
      .then((r) => {
        if (cancelled) return
        const eps = r.podcasts.map(toEpisode)
        setEpisodes(eps)
        setTotalCatalog(r.total)
        if (eps[0] && !playing) {
          setPlaying({ title: eps[0].t, host: eps[0].h, ep: `Ep. ${eps[0].ep} · ${eps[0].d}`, pos: 0 })
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <PageHeader
        eyebrow="Tavern · hearthside tales"
        title="Tales by the Hearth"
        subtitle="Podcasts, guest lectures and live stories from the druz9 world."
        right={
          <span
            className="font-silkscreen uppercase"
            style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.1em' }}
          >
            {totalCatalog} in catalog
          </span>
        }
      />

      {/* Player bar */}
      <Panel variant="dark" style={{ padding: 0, overflow: 'hidden', marginBottom: 14 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '160px 1fr 200px',
            alignItems: 'center',
            gap: 16,
            padding: '14px 20px',
          }}
        >
          <div
            style={{
              height: 120,
              background: 'linear-gradient(135deg, #3d6149 0%, #2a1f15 100%)',
              border: '3px solid var(--ink-0)',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Fireplace scale={3} />
            <Fireflies count={4} />
          </div>
          <div>
            <div
              className="font-silkscreen uppercase"
              style={{ color: 'var(--ember-3)', fontSize: 10, letterSpacing: '0.1em' }}
            >
              NOW PLAYING · {playing?.ep ?? '—'}
            </div>
            <div
              style={{
                fontFamily: 'Pixelify Sans, monospace',
                fontSize: 22,
                color: 'var(--parch-0)',
                marginTop: 2,
              }}
            >
              {playing?.title ?? 'Pick an episode'}
            </div>
            <div
              className="font-silkscreen uppercase"
              style={{
                color: 'var(--parch-2)',
                fontSize: 10,
                letterSpacing: '0.08em',
                marginTop: 2,
              }}
            >
              {playing ? `with ${playing.host}` : 'tavern is quiet'}
            </div>
            <div style={{ marginTop: 10 }}>
              <Bar value={(playing?.pos ?? 0) * 100} />
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 8,
              }}
            >
              <span
                className="font-silkscreen uppercase"
                style={{ color: 'var(--parch-2)', fontSize: 9, letterSpacing: '0.08em' }}
              >
                17:42 / 52:14
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <span
                  className="rpg-tweak-chip"
                  style={{
                    background: '#2a1f15',
                    color: 'var(--parch-2)',
                    borderColor: '#4a3028',
                  }}
                >
                  1.0×
                </span>
                <span
                  className="rpg-tweak-chip"
                  style={{
                    background: '#2a1f15',
                    color: 'var(--parch-2)',
                    borderColor: '#4a3028',
                  }}
                >
                  sleep timer
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
            <RpgButton size="sm" style={{ padding: '12px 14px', fontSize: 18 }}>
              ⏮
            </RpgButton>
            <RpgButton size="sm" variant="primary" style={{ padding: '14px 18px', fontSize: 20 }}>
              ▶
            </RpgButton>
            <RpgButton size="sm" style={{ padding: '12px 14px', fontSize: 18 }}>
              ⏭
            </RpgButton>
          </div>
        </div>
      </Panel>

      <div className="rpg-tabs">
        {(
          [
            ['featured', 'Featured'],
            ['series', 'Series'],
            ['history', 'History'],
            ['saved', 'Saved (12)'],
          ] as const
        ).map(([id, t]) => (
          <div
            key={id}
            className={`rpg-tab ${tab === id ? 'rpg-tab--active' : ''}`}
            onClick={() => setTab(id as Tab)}
          >
            {t}
          </div>
        ))}
      </div>

      <div className="rpg-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 18 }}>
        <div>
          <h3 className="font-display" style={{ fontSize: 17, marginBottom: 12 }}>
            New from the hearth
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {episodes.map((p) => (
              <Panel
                key={p.ep}
                variant="tight"
                style={{ padding: 12, cursor: 'pointer' }}
                onClick={() =>
                  setPlaying({
                    title: p.t,
                    host: p.h,
                    ep: `Ep. ${p.ep} · ${p.d}`,
                    pos: 0,
                  })
                }
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      background: p.c,
                      border: '3px solid var(--ink-0)',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'Silkscreen, monospace',
                        fontSize: 20,
                        color: 'var(--parch-0)',
                        letterSpacing: '0.04em',
                      }}
                    >
                      EP{p.ep}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: 'Pixelify Sans, monospace',
                        fontSize: 14,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {p.t}
                    </div>
                    <div
                      className="font-silkscreen uppercase"
                      style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
                    >
                      {p.h} · {p.d}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        gap: 4,
                        marginTop: 8,
                        flexWrap: 'wrap',
                      }}
                    >
                      {p.tags.map((t) => (
                        <Badge key={t} style={{ fontSize: 9 }}>
                          {t}
                        </Badge>
                      ))}
                      {p.heard && (
                        <Badge variant="moss" style={{ fontSize: 9 }}>
                          ✓ heard
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Panel>
            ))}
          </div>

          <h3 className="font-display" style={{ fontSize: 17, marginTop: 16, marginBottom: 12 }}>
            Series
          </h3>
          <div className="rpg-podcasts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {SERIES.map(([n, c, col]) => (
              <div
                key={String(n)}
                style={{
                  padding: 10,
                  border: '3px solid var(--ink-0)',
                  background: 'var(--parch-0)',
                  boxShadow: '3px 3px 0 var(--ink-0)',
                }}
              >
                <div
                  style={{
                    height: 60,
                    background: col,
                    border: '2px solid var(--ink-0)',
                    marginBottom: 6,
                  }}
                />
                <div
                  style={{
                    fontFamily: 'Pixelify Sans, monospace',
                    fontSize: 12,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {n}
                </div>
                <div
                  className="font-silkscreen uppercase"
                  style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
                >
                  {c} episodes
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Panel variant="recessed" style={{ padding: 14, marginBottom: 12 }}>
            <h3 className="font-display" style={{ fontSize: 17, marginBottom: 10 }}>
              Queue · 5
            </h3>
            {QUEUE.map(([s, t, d], i) => (
              <div
                key={i}
                style={{
                  padding: '8px 0',
                  borderBottom: i < QUEUE.length - 1 ? '1px dashed var(--ink-3)' : 'none',
                }}
              >
                <div
                  className="font-silkscreen uppercase"
                  style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
                >
                  {s}
                </div>
                <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 12 }}>{t}</div>
                <div
                  className="font-silkscreen uppercase"
                  style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
                >
                  {d}
                </div>
              </div>
            ))}
          </Panel>

          <Panel>
            <h3 className="font-display" style={{ fontSize: 17 }}>
              Listening pact
            </h3>
            <div
              className="font-silkscreen uppercase"
              style={{
                fontSize: 9,
                color: 'var(--ink-2)',
                letterSpacing: '0.08em',
                marginBottom: 8,
              }}
            >
              this month
            </div>
            <div
              style={{
                fontFamily: 'Pixelify Sans, monospace',
                fontSize: 32,
                color: 'var(--ember-1)',
              }}
            >
              14h 20m
            </div>
            <div style={{ marginTop: 8 }}>
              <Bar value={71} />
            </div>
            <div
              className="font-silkscreen uppercase"
              style={{
                fontSize: 9,
                color: 'var(--ink-2)',
                letterSpacing: '0.08em',
                marginTop: 6,
              }}
            >
              71% of 20h goal · +200 ✦ on complete
            </div>
          </Panel>
        </div>
      </div>
    </>
  )
}
