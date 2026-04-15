import { useEffect, useState, useCallback } from 'react'
import { Mic, Play, Pause, Search, Upload, X } from 'lucide-react'
import { podcastApi } from '@/features/Podcast/api/podcastApi'
import type { Podcast } from '@/entities/Podcast/model/types'
import { Card } from '@/shared/ui/Card'
import { Badge } from '@/shared/ui/Badge'
import { ErrorState } from '@/shared/ui/ErrorState'
import { useAuth } from '@/app/providers/AuthProvider'
import { apiClient } from '@/shared/api/base'
import { useAudioPlayer } from '@/features/Podcast/providers/AudioPlayerProvider'


function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatTimeAgo(iso: string) {
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return 'today'
    if (days === 1) return 'yesterday'
    if (days < 7) return `${days}d ago`
    if (days < 30) return `${Math.floor(days / 7)}w ago`
    return `${Math.floor(days / 30)}mo ago`
  } catch { return '' }
}

const GRADIENT_COLORS = [
  ['#6366f1', '#8b5cf6'],
  ['#22c55e', '#16a34a'],
  ['#f59e0b', '#6366F1'],
  ['#ec4899', '#be185d'],
  ['#3b82f6', '#1d4ed8'],
  ['#14b8a6', '#0d9488'],
]

export function PodcastsPage() {
  const { user } = useAuth()
  const player = useAudioPlayer()
  const [podcasts, setPodcasts] = useState<Podcast[]>([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadAuthor, setUploadAuthor] = useState('')
  const [uploadDesc, setUploadDesc] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const fetchPodcasts = useCallback(() => {
    setError(null)
    podcastApi.list({ limit: 50 })
      .then(r => setPodcasts(r.podcasts))
      .catch(() => setError('Failed to load data'))
  }, [])

  useEffect(() => { fetchPodcasts() }, [fetchPodcasts])

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = ((e.clientX - rect.left) / rect.width) * 100
    player.seek(Math.max(0, Math.min(100, pct)))
  }

  const SPEEDS = [0.75, 1, 1.25, 1.5, 2]
  const cycleSpeed = () => {
    const idx = SPEEDS.indexOf(player.speed)
    player.setSpeed(SPEEDS[(idx + 1) % SPEEDS.length])
  }

  const filtered = podcasts.filter(p => {
    if (search && !p.title.toLowerCase().includes(search.toLowerCase()) && !p.authorName.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const [uploadError, setUploadError] = useState<string | null>(null)

  // Warn user if they try to leave while uploading
  useEffect(() => {
    if (!uploading) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [uploading])

  const handleUpload = async () => {
    if (!uploadTitle || !uploadFile) return
    setUploadError(null)
    setUploading(true)
    try {
      // Step 1: Create podcast record
      const createRes = await apiClient.post<{ podcast: { id: string } }>('/api/admin/podcasts', {
        title: uploadTitle,
        author: uploadAuthor || undefined,
        description: uploadDesc || undefined,
      })
      const podcastId = createRes.data.podcast.id

      // Determine content type enum from MIME type
      const mimeType = uploadFile.type
      let contentType = 'MEDIA_CONTENT_TYPE_AUDIO_MPEG'
      if (mimeType === 'audio/wav') contentType = 'MEDIA_CONTENT_TYPE_AUDIO_WAV'
      else if (mimeType === 'audio/ogg') contentType = 'MEDIA_CONTENT_TYPE_AUDIO_OGG'
      else if (mimeType === 'audio/mp4' || mimeType === 'audio/x-m4a') contentType = 'MEDIA_CONTENT_TYPE_AUDIO_MP4'

      // Get duration from audio metadata
      let durationSeconds = 0
      try {
        const blobUrl = URL.createObjectURL(uploadFile)
        durationSeconds = await new Promise<number>((resolve) => {
          const audio = new Audio(blobUrl)
          audio.addEventListener('loadedmetadata', () => { URL.revokeObjectURL(blobUrl); resolve(Math.round(audio.duration) || 0) })
          audio.addEventListener('error', () => { URL.revokeObjectURL(blobUrl); resolve(0) })
        })
      } catch { durationSeconds = 0 }

      // Step 2: Prepare upload — get S3 pre-signed URL
      const prepareRes = await apiClient.post<{ uploadUrl: string; objectKey: string }>(
        `/api/admin/podcasts/${podcastId}/upload/prepare`,
        { fileName: uploadFile.name, contentType, durationSeconds },
      )
      const { uploadUrl, objectKey } = prepareRes.data

      // Step 3: Upload file directly to S3/MinIO
      await fetch(uploadUrl, {
        method: 'PUT',
        body: uploadFile,
        headers: { 'Content-Type': uploadFile.type || 'audio/mpeg' },
      })

      // Step 4: Mark upload as complete
      await apiClient.post(`/api/admin/podcasts/${podcastId}/upload/complete`, {
        fileName: uploadFile.name,
        contentType,
        durationSeconds,
        objectKey,
      })

      setShowUpload(false)
      setUploadTitle(''); setUploadAuthor(''); setUploadDesc(''); setUploadFile(null)
      fetchPodcasts()
    } catch {
      setUploadError('Failed to upload podcast. Try again.')
    } finally {
      setUploading(false)
    }
  }

  if (error) return <ErrorState message={error} onRetry={() => { setError(null); fetchPodcasts() }} />

  return (
    <div className="flex min-h-full flex-col gap-4 px-4 pb-6 pt-4 md:gap-6 md:p-8">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="font-mono text-2xl font-bold text-[#111111]">Podcasts</h1>
          <p className="text-sm text-[#666666] font-geist mt-1">Listen and learn from strong engineers</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center xl:w-auto">
          {user?.isAdmin && (
            <button
              onClick={() => setShowUpload(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6366F1] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#4F46E5]"
            >
              <Upload className="w-4 h-4" /> Upload podcast
            </button>
          )}
          <div className="relative w-full sm:flex-1 xl:w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search podcasts..."
              className="w-full rounded-xl border border-[#CBCCC9] bg-white py-2.5 pl-10 pr-4 text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 flex-col gap-6 xl:flex-row">
        {/* Left column */}
        <div className="flex-1 flex flex-col gap-5 min-w-0">
          {/* Now Playing */}
          {player.playing && (
            <div className="animate-fade-in flex flex-col gap-4 rounded-2xl bg-[#0f172a] p-5 sm:flex-row sm:items-center sm:gap-5 sm:p-6">
              <div
                className="w-[120px] h-[120px] rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `linear-gradient(135deg, #6366F1, #f59e0b)` }}
              >
                <Mic className="w-12 h-12 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-[#6366F1] font-medium tracking-wider font-geist uppercase">Now playing</p>
                <h3 className="font-mono text-lg font-bold text-white mt-1 truncate">{player.playing.title}</h3>
                <p className="text-sm text-[#94a3b8] font-geist mt-0.5">
                  {player.playing.authorName} · {formatDuration(player.duration)}
                </p>
                <div className="flex items-center gap-3 mt-3">
                  <button
                    onClick={player.isPlaying ? player.pause : player.resume}
                    className="w-10 h-10 rounded-full bg-[#6366F1] flex items-center justify-center hover:bg-[#ea7700] transition-colors"
                  >
                    {player.isPlaying ? <Pause className="w-[18px] h-[18px] text-white" /> : <Play className="w-[18px] h-[18px] text-white ml-0.5" />}
                  </button>
                  {/* Speed */}
                  <button
                    onClick={cycleSpeed}
                    className="px-2 py-1 text-[11px] font-bold text-[#64748b] hover:text-white bg-[#1e293b] hover:bg-[#263148] rounded-md transition-colors min-w-[40px] text-center"
                  >
                    {player.speed === 1 ? '1×' : `${player.speed}×`}
                  </button>
                  <div className="flex-1 flex items-center gap-2">
                    {/* Seekable progress bar */}
                    <div
                      className="flex-1 h-2 bg-[#1e293b] rounded-full overflow-hidden cursor-pointer group relative"
                      onClick={handleSeek}
                    >
                      <div
                        className="h-full bg-[#6366F1] rounded-full relative transition-all duration-300"
                        style={{ width: `${player.progress}%` }}
                      >
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-[#666666] w-[90px] text-right flex-shrink-0">
                      {formatDuration(player.currentTime)} / {formatDuration(player.duration)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Episode list header */}
          <h2 className="font-mono text-base font-semibold text-[#111111]">
            {player.playing ? 'Latest episodes' : 'All podcasts'}
          </h2>

          {/* Episode list */}
          <div className="flex flex-col gap-2">
            {filtered.length === 0 && podcasts.length === 0 ? (
              // Skeleton
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-[#CBCCC9] animate-pulse">
                  <div className="w-14 h-14 rounded-xl bg-[#E7E8E5]" />
                  <div className="flex-1">
                    <div className="h-4 bg-[#E7E8E5] rounded w-48 mb-2" />
                    <div className="h-3 bg-[#E7E8E5] rounded w-32" />
                  </div>
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <Mic className="w-10 h-10 mx-auto mb-3 text-[#CBCCC9]" />
                <p className="text-sm text-[#94a3b8]">No podcasts found</p>
              </div>
            ) : (
              filtered.map((podcast, i) => {
                const colors = GRADIENT_COLORS[i % GRADIENT_COLORS.length]
                const isCurrentlyPlaying = player.playing?.id === podcast.id
                return (
                  <button
                    key={podcast.id}
                    onClick={() => player.play(podcast)}
                    className={`stagger-item flex flex-col items-start gap-4 rounded-xl border p-4 text-left transition-all duration-200 sm:flex-row sm:items-center ${
                      isCurrentlyPlaying
                        ? 'bg-[#fff7ed] border-[#6366F1]/30'
                        : 'bg-white border-[#CBCCC9] hover:border-[#94a3b8] hover:shadow-sm'
                    }`}
                  >
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }}
                    >
                      {isCurrentlyPlaying && player.isPlaying ? (
                        <Pause className="w-6 h-6 text-white" />
                      ) : (
                        <Play className="w-6 h-6 text-white ml-0.5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 self-stretch">
                      <p className="text-sm font-semibold text-[#111111] font-geist truncate">{podcast.title}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-[#666666] font-geist">{podcast.authorName}</span>
                        <span className="w-1 h-1 rounded-full bg-[#CBCCC9]" />
                        <span className="text-xs text-[#666666] font-geist">{formatDuration(podcast.durationSeconds)}</span>
                        <span className="w-1 h-1 rounded-full bg-[#CBCCC9]" />
                        <span className="text-xs text-[#666666] font-geist">{formatTimeAgo(podcast.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-start">
                      {podcast.listensCount > 0 && (
                        <span className="text-xs text-[#94a3b8]">{podcast.listensCount} listens</span>
                      )}
                      <div className="w-9 h-9 rounded-full bg-[#F2F3F0] flex items-center justify-center">
                        {isCurrentlyPlaying && player.isPlaying ? (
                          <Pause className="w-4 h-4 text-[#111111]" />
                        ) : (
                          <Play className="w-4 h-4 text-[#111111] ml-0.5" />
                        )}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="flex w-full flex-shrink-0 flex-col gap-4 xl:w-[320px]">
          {/* Popular shows */}
          <Card padding="lg" className="flex flex-col gap-4">
            <h3 className="font-mono text-sm font-semibold text-[#111111]">Popular shows</h3>
            {(podcasts.length > 0
              ? [...new Map(podcasts.map(p => [p.authorName, p])).values()].slice(0, 3)
              : []
            ).map((show, i) => {
              const colors = GRADIENT_COLORS[i % GRADIENT_COLORS.length]
              return (
                <div key={show.authorName} className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }}
                  >
                    <Mic className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#111111] font-geist truncate">{show.authorName}</p>
                    <p className="text-xs text-[#666666] font-geist">
                      {podcasts.filter(p => p.authorName === show.authorName).length} episodes
                    </p>
                  </div>
                </div>
              )
            })}
            {podcasts.length === 0 && (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-11 h-11 rounded-xl bg-[#E7E8E5]" />
                    <div className="flex-1">
                      <div className="h-3.5 bg-[#E7E8E5] rounded w-28 mb-1.5" />
                      <div className="h-3 bg-[#E7E8E5] rounded w-20" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Stats card */}
          <Card padding="lg" dark>
            <h3 className="font-mono text-sm font-semibold text-[#CBCCC9] mb-4">Stats</h3>
            <div className="flex gap-4 mb-4">
              <div className="flex-1 text-center">
                <p className="font-mono text-[28px] font-bold text-[#6366F1] leading-none">{podcasts.length || '—'}</p>
                <p className="text-[11px] text-[#94a3b8] mt-1 font-geist">Episodes</p>
              </div>
              <div className="flex-1 text-center">
                <p className="font-mono text-[28px] font-bold text-[#6366F1] leading-none">
                  {podcasts.reduce((sum, p) => sum + p.listensCount, 0) || '—'}
                </p>
                <p className="text-[11px] text-[#94a3b8] mt-1 font-geist">Listeners</p>
              </div>
            </div>
            <div className="h-px bg-[#1e293b] mb-4" />
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#666666] font-geist">New episode every Friday</p>
              <Badge variant="orange">Follow</Badge>
            </div>
          </Card>
        </div>
      </div>

      {/* Upload modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl border border-[#CBCCC9] w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-[#111111]">Upload podcast</h2>
              <button onClick={() => { if (!uploading) setShowUpload(false) }} disabled={uploading} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F2F3F0] text-[#666666] disabled:opacity-30 disabled:cursor-not-allowed">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-medium text-[#666666] mb-1 block">Title *</label>
                <input value={uploadTitle} onChange={e => setUploadTitle(e.target.value)}
                  placeholder="Podcast title"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0f1117] text-[#111111] dark:text-[#e2e8f3] border border-[#CBCCC9] dark:border-[#1e3158] rounded-lg focus:outline-none focus:border-[#6366F1] dark:focus:border-[#6366F1] placeholder:text-[#94a3b8]" />
              </div>
              <div>
                <label className="text-xs font-medium text-[#666666] mb-1 block">Author *</label>
                <input value={uploadAuthor} onChange={e => setUploadAuthor(e.target.value)}
                  placeholder="Author name"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0f1117] text-[#111111] dark:text-[#e2e8f3] border border-[#CBCCC9] dark:border-[#1e3158] rounded-lg focus:outline-none focus:border-[#6366F1] dark:focus:border-[#6366F1] placeholder:text-[#94a3b8]" />
              </div>
              <div>
                <label className="text-xs font-medium text-[#666666] mb-1 block">Description</label>
                <textarea value={uploadDesc} onChange={e => setUploadDesc(e.target.value)}
                  placeholder="Short description"
                  rows={2}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0f1117] text-[#111111] dark:text-[#e2e8f3] border border-[#CBCCC9] dark:border-[#1e3158] rounded-lg focus:outline-none focus:border-[#6366F1] dark:focus:border-[#6366F1] placeholder:text-[#94a3b8] resize-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-[#666666] mb-1 block">Audio file * (mp3, m4a)</label>
                <input type="file" accept="audio/*"
                  onChange={e => setUploadFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-[#666666] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[#EEF2FF] file:text-[#6366F1] hover:file:bg-[#E0E7FF]" />
              </div>
            </div>
            {uploading && (
              <p className="mt-3 text-xs text-[#f59e0b] font-medium text-center">
                Uploading. Do not close the page or the modal
              </p>
            )}
            {uploadError && (
              <p className="mt-2 text-xs text-[#dc2626] text-center">{uploadError}</p>
            )}
            <div className="flex gap-2 mt-4">
              <button onClick={() => { if (!uploading) setShowUpload(false) }} disabled={uploading}
                className="flex-1 py-2 text-sm font-medium text-[#666666] bg-[#F2F3F0] rounded-xl hover:bg-[#E7E8E5] transition-colors">
                Cancel
              </button>
              <button onClick={handleUpload} disabled={uploading || !uploadTitle || !uploadFile}
                className="flex-1 py-2 text-sm font-medium text-white bg-[#6366F1] rounded-xl hover:bg-[#4F46E5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
