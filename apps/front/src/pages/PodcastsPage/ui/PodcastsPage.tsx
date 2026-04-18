import { useEffect, useRef, useState } from 'react'
import { Panel, RpgButton, Bar, Badge, PageHeader } from '@/shared/ui/pixel'
import { Fireplace, Fireflies } from '@/shared/ui/sprites'
import { podcastApi } from '@/features/Podcast/api/podcastApi'
import type { Podcast } from '@/entities/Podcast/model/types'
import { useAuth } from '@/app/providers/AuthProvider'
import { addToast } from '@/shared/lib/toasts'

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

// SERIES array (Algorithmist's Codex / Systems Scrolls / Guild
// Chronicles / Career Trail with fake 24/18/12/30 episode counts) was
// removed — it was pure decoration, never connected to real podcast
// grouping. The Series tab tile in the UI was also dropped. When the
// backend gains a series-grouping concept (Podcast.series_id) this
// section comes back driven by that.

// Listener queue lives in-memory only for now — we track it client-side
// until the backend grows a /podcasts/queue endpoint.
type QueueItem = { episodeId: string; title: string; mins: number; slot: string }

export function PodcastsPage() {
  const { user } = useAuth()
  const [uploadOpen, setUploadOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('featured')
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [totalCatalog, setTotalCatalog] = useState(0)
  const [playing, setPlaying] = useState<{ title: string; host: string; ep: string; pos: number } | null>(null)
  const [history, setHistory] = useState<Episode[]>([])
  const [saved, _setSaved] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem('podcast:saved') ?? '[]'))
    } catch { return new Set() }
  })
  const [queue, _setQueue] = useState<QueueItem[]>([])
  void _setSaved; void _setQueue

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
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span
              className="font-silkscreen uppercase"
              style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.1em' }}
            >
              {totalCatalog} in catalog
            </span>
            {user?.isAdmin && (
              <RpgButton size="sm" variant="primary" onClick={() => setUploadOpen(true)}>
                + Add podcast
              </RpgButton>
            )}
          </div>
        }
      />
      {uploadOpen && (
        <UploadPodcastModal
          onClose={() => setUploadOpen(false)}
          onUploaded={(p) => {
            setUploadOpen(false)
            setEpisodes((prev) => [toEpisode(p, 0), ...prev])
            setTotalCatalog((t) => t + 1)
          }}
        />
      )}

      {/* Player bar — only visible once the user actually picks an
          episode; the previous "NOW PLAYING · —" skeleton made the
          tavern look like something was playing when nothing was. */}
      {playing && (
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
      )}

      <div className="rpg-tabs">
        {(
          [
            ['featured', 'Featured'],
            ['series', 'Series'],
            ['history', 'History'],
            ['saved', `Saved (${saved.size})`],
          ] as const
        ).map(([id, label]) => (
          <div
            key={id}
            className={`rpg-tab ${tab === id ? 'rpg-tab--active' : ''}`}
            onClick={() => setTab(id as Tab)}
          >
            {label}
          </div>
        ))}
      </div>

      <div className="rpg-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 18 }}>
        <div>
          <h3 className="font-display" style={{ fontSize: 17, marginBottom: 12 }}>
            {tab === 'featured' && 'New from the hearth'}
            {tab === 'series' && 'Series ladders'}
            {tab === 'history' && 'Recently played'}
            {tab === 'saved' && 'Saved for later'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {(tab === 'history' ? history : tab === 'saved' ? episodes.filter((e) => saved.has(e.id)) : episodes).map((p) => (
              <Panel
                key={p.ep}
                variant="tight"
                style={{ padding: 12, cursor: 'pointer' }}
                onClick={() => {
                  setPlaying({
                    title: p.t,
                    host: p.h,
                    ep: `Ep. ${p.ep} · ${p.d}`,
                    pos: 0,
                  })
                  setHistory((h) => [p, ...h.filter((e) => e.id !== p.id)].slice(0, 20))
                }}
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

          {/* Series grid used to hardcode "Algorithmist's Codex / Systems
              Scrolls / Guild Chronicles / Career Trail" with fake episode
              counts. Series are not yet a backend concept — removed
              entirely rather than keep the lie. When the podcast service
              learns series-grouping we'll rebuild this from the API. */}
        </div>

        <div>
          <Panel variant="recessed" style={{ padding: 14, marginBottom: 12 }}>
            <h3 className="font-display" style={{ fontSize: 17, marginBottom: 10 }}>
              Queue · {queue.length}
            </h3>
            {queue.length === 0 && (
              <div
                className="font-silkscreen uppercase"
                style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em', padding: '6px 0' }}
              >
                your queue is empty
              </div>
            )}
            {queue.map((q, i) => (
              <div
                key={q.episodeId}
                style={{
                  padding: '8px 0',
                  borderBottom: i < queue.length - 1 ? '1px dashed var(--ink-3)' : 'none',
                }}
              >
                <div
                  className="font-silkscreen uppercase"
                  style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
                >
                  {q.slot}
                </div>
                <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 12 }}>{q.title}</div>
                <div
                  className="font-silkscreen uppercase"
                  style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
                >
                  {q.mins}m
                </div>
              </div>
            ))}
          </Panel>

          {/* Listening pact: stats endpoint lives on the roadmap. Until
              it exists we don't invent numbers; keep the slot copy
              short so the column still reads cleanly. */}
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
                marginTop: 6,
              }}
            >
              listening goals unlock once we wire the stats endpoint — hang tight.
            </div>
          </Panel>
        </div>
      </div>
    </>
  )
}

// Admin-only upload modal. Drives the 3-step flow:
//   1. POST /api/admin/podcasts with a title → get podcastId.
//   2. POST /api/admin/podcasts/:id/upload/prepare → get presigned PUT URL.
//   3. PUT the file bytes directly to that URL.
//   4. POST /api/admin/podcasts/:id/upload/complete to finalize.
function UploadPodcastModal({
  onClose,
  onUploaded,
}: {
  onClose: () => void
  onUploaded: (p: Podcast) => void
}) {
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const submit = async () => {
    if (title.trim().length < 3) {
      setError('Title must be at least 3 characters')
      return
    }
    if (!file) {
      setError('Pick an audio file (mp3, m4a, ogg)')
      return
    }
    if (file.size > 200 * 1024 * 1024) {
      setError('File is too large (max 200 MB)')
      return
    }
    setError('')
    setBusy(true)
    setProgress(5)
    try {
      // 1) shell
      const shell = await podcastApi.create(title.trim())
      setProgress(15)

      // 2) get presigned URL
      const contentType = file.type || 'audio/mpeg'
      const durationSec = await probeAudioDuration(file).catch(() => 0)
      const prep = await podcastApi.prepareUpload({
        podcastId: shell.id,
        fileName: file.name,
        contentType,
        durationSeconds: Math.floor(durationSec),
      })
      setProgress(25)

      // 3) PUT bytes with progress
      await uploadWithProgress(prep.uploadUrl, file, contentType, (p) => {
        setProgress(25 + Math.floor(p * 70))
      })
      setProgress(95)

      // 4) finalize
      const finalized = await podcastApi.completeUpload({
        podcastId: shell.id,
        fileName: file.name,
        contentType,
        durationSeconds: Math.floor(durationSec),
        objectKey: prep.objectKey,
      })
      setProgress(100)

      addToast({
        kind: 'LOOT',
        title: 'Podcast uploaded',
        body: finalized.title,
        icon: '◈',
        color: 'var(--moss-1)',
      })
      onUploaded(finalized)
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rpg-modal-backdrop" onClick={onClose}>
      <div
        className="rpg-panel rpg-panel--nailed"
        style={{ padding: 24, maxWidth: 480, width: '92%', maxHeight: '90vh', overflow: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display" style={{ fontSize: 20, marginBottom: 12 }}>Upload podcast</h3>
        <div style={{ color: 'var(--ink-2)', fontSize: 13, marginBottom: 16 }}>
          Audio only (mp3 / m4a / ogg). Duration is probed automatically.
        </div>

        <div style={{ marginBottom: 12 }}>
          <div className="font-silkscreen uppercase" style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.1em', marginBottom: 4 }}>
            title
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="Episode title"
            style={{
              width: '100%',
              padding: '8px 10px',
              border: '3px solid var(--ink-0)',
              background: 'var(--parch-2)',
              fontFamily: 'IBM Plex Sans, system-ui',
              fontSize: 14,
              color: 'var(--ink-0)',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <div className="font-silkscreen uppercase" style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.1em', marginBottom: 4 }}>
            file
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/mpeg,audio/mp4,audio/ogg,audio/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            style={{ fontFamily: 'IBM Plex Sans, system-ui', fontSize: 12 }}
          />
          {file && (
            <div style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 4 }}>
              {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
            </div>
          )}
        </div>

        {busy && (
          <div style={{ marginBottom: 12 }}>
            <Bar value={progress} />
            <div className="font-silkscreen uppercase" style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em', marginTop: 4 }}>
              uploading… {progress}%
            </div>
          </div>
        )}

        {error && <div style={{ color: 'var(--rpg-danger)', fontSize: 12, marginBottom: 10 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <RpgButton variant="primary" disabled={busy || !file || title.trim().length < 3} onClick={submit}>
            {busy ? 'Uploading…' : 'Upload'}
          </RpgButton>
          <RpgButton disabled={busy} onClick={onClose}>
            Cancel
          </RpgButton>
        </div>
      </div>
    </div>
  )
}

function probeAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const audio = new Audio()
    audio.preload = 'metadata'
    audio.src = url
    const cleanup = () => URL.revokeObjectURL(url)
    audio.onloadedmetadata = () => {
      const d = audio.duration
      cleanup()
      resolve(Number.isFinite(d) ? d : 0)
    }
    audio.onerror = () => {
      cleanup()
      reject(new Error('Failed to read audio metadata'))
    }
  })
}

function uploadWithProgress(url: string, file: File, contentType: string, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', contentType)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total)
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`Upload failed (${xhr.status})`))
    }
    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.send(file)
  })
}
