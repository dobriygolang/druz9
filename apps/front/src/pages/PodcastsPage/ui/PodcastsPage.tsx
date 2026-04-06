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
    if (days === 0) return 'сегодня'
    if (days === 1) return 'вчера'
    if (days < 7) return `${days} дн. назад`
    if (days < 30) return `${Math.floor(days / 7)} нед. назад`
    return `${Math.floor(days / 30)} мес. назад`
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
      .catch(() => setError('Не удалось загрузить данные'))
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
      const createRes = await apiClient.post<{ podcast: { id: string } }>('/api/admin/podcasts', { title: uploadTitle })
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
      setUploadError('Не удалось загрузить подкаст. Попробуйте снова.')
    } finally {
      setUploading(false)
    }
  }

  if (error) return <ErrorState message={error} onRetry={() => { setError(null); fetchPodcasts() }} />

  return (
    <div className="p-8 flex flex-col gap-6 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-2xl font-bold text-[#111111]">Подкасты</h1>
          <p className="text-sm text-[#666666] font-geist mt-1">Слушай и учись у лучших разработчиков</p>
        </div>
        <div className="flex items-center gap-3">
        {user?.isAdmin && (
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#6366F1] text-white text-sm font-medium hover:bg-[#4F46E5] transition-colors"
          >
            <Upload className="w-4 h-4" /> Загрузить подкаст
          </button>
        )}
        <div className="relative w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск подкастов..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#CBCCC9] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20 transition-shadow"
          />
        </div>
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Left column */}
        <div className="flex-1 flex flex-col gap-5 min-w-0">
          {/* Now Playing */}
          {player.playing && (
            <div className="bg-[#0f172a] rounded-2xl p-6 flex items-center gap-5 animate-fade-in">
              <div
                className="w-[120px] h-[120px] rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `linear-gradient(135deg, #6366F1, #f59e0b)` }}
              >
                <Mic className="w-12 h-12 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-[#6366F1] font-medium tracking-wider font-geist uppercase">Сейчас играет</p>
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
            {player.playing ? 'Последние эпизоды' : 'Все подкасты'}
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
                <p className="text-sm text-[#94a3b8]">Подкасты не найдены</p>
              </div>
            ) : (
              filtered.map((podcast, i) => {
                const colors = GRADIENT_COLORS[i % GRADIENT_COLORS.length]
                const isCurrentlyPlaying = player.playing?.id === podcast.id
                return (
                  <button
                    key={podcast.id}
                    onClick={() => player.play(podcast)}
                    className={`stagger-item flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-200 ${
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
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#111111] font-geist truncate">{podcast.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-[#666666] font-geist">{podcast.authorName}</span>
                        <span className="w-1 h-1 rounded-full bg-[#CBCCC9]" />
                        <span className="text-xs text-[#666666] font-geist">{formatDuration(podcast.durationSeconds)}</span>
                        <span className="w-1 h-1 rounded-full bg-[#CBCCC9]" />
                        <span className="text-xs text-[#666666] font-geist">{formatTimeAgo(podcast.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {podcast.listensCount > 0 && (
                        <span className="text-xs text-[#94a3b8]">{podcast.listensCount} прослушиваний</span>
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
        <div className="w-[320px] flex-shrink-0 flex flex-col gap-4">
          {/* Popular shows */}
          <Card padding="lg" className="flex flex-col gap-4">
            <h3 className="font-mono text-sm font-semibold text-[#111111]">Популярные шоу</h3>
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
                      {podcasts.filter(p => p.authorName === show.authorName).length} эпизодов
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
            <h3 className="font-mono text-sm font-semibold text-[#CBCCC9] mb-4">Статистика</h3>
            <div className="flex gap-4 mb-4">
              <div className="flex-1 text-center">
                <p className="font-mono text-[28px] font-bold text-[#6366F1] leading-none">{podcasts.length || '—'}</p>
                <p className="text-[11px] text-[#94a3b8] mt-1 font-geist">Эпизодов</p>
              </div>
              <div className="flex-1 text-center">
                <p className="font-mono text-[28px] font-bold text-[#6366F1] leading-none">
                  {podcasts.reduce((sum, p) => sum + p.listensCount, 0) || '—'}
                </p>
                <p className="text-[11px] text-[#94a3b8] mt-1 font-geist">Слушателей</p>
              </div>
            </div>
            <div className="h-px bg-[#1e293b] mb-4" />
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#666666] font-geist">Новый эпизод каждую пятницу</p>
              <Badge variant="orange">Подписаться</Badge>
            </div>
          </Card>
        </div>
      </div>

      {/* Upload modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl border border-[#CBCCC9] w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-[#111111]">Загрузить подкаст</h2>
              <button onClick={() => { if (!uploading) setShowUpload(false) }} disabled={uploading} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F2F3F0] text-[#666666] disabled:opacity-30 disabled:cursor-not-allowed">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-medium text-[#666666] mb-1 block">Название *</label>
                <input value={uploadTitle} onChange={e => setUploadTitle(e.target.value)}
                  placeholder="Название подкаста"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0f1117] text-[#111111] dark:text-[#e2e8f3] border border-[#CBCCC9] dark:border-[#1e3158] rounded-lg focus:outline-none focus:border-[#6366F1] dark:focus:border-[#6366F1] placeholder:text-[#94a3b8]" />
              </div>
              <div>
                <label className="text-xs font-medium text-[#666666] mb-1 block">Автор *</label>
                <input value={uploadAuthor} onChange={e => setUploadAuthor(e.target.value)}
                  placeholder="Имя автора"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0f1117] text-[#111111] dark:text-[#e2e8f3] border border-[#CBCCC9] dark:border-[#1e3158] rounded-lg focus:outline-none focus:border-[#6366F1] dark:focus:border-[#6366F1] placeholder:text-[#94a3b8]" />
              </div>
              <div>
                <label className="text-xs font-medium text-[#666666] mb-1 block">Описание</label>
                <textarea value={uploadDesc} onChange={e => setUploadDesc(e.target.value)}
                  placeholder="Краткое описание"
                  rows={2}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0f1117] text-[#111111] dark:text-[#e2e8f3] border border-[#CBCCC9] dark:border-[#1e3158] rounded-lg focus:outline-none focus:border-[#6366F1] dark:focus:border-[#6366F1] placeholder:text-[#94a3b8] resize-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-[#666666] mb-1 block">Аудиофайл * (mp3, m4a)</label>
                <input type="file" accept="audio/*"
                  onChange={e => setUploadFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-[#666666] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[#EEF2FF] file:text-[#6366F1] hover:file:bg-[#E0E7FF]" />
              </div>
            </div>
            {uploading && (
              <p className="mt-3 text-xs text-[#f59e0b] font-medium text-center">
                Идёт загрузка — не закрывайте страницу и модальное окно
              </p>
            )}
            {uploadError && (
              <p className="mt-2 text-xs text-[#dc2626] text-center">{uploadError}</p>
            )}
            <div className="flex gap-2 mt-4">
              <button onClick={() => { if (!uploading) setShowUpload(false) }} disabled={uploading}
                className="flex-1 py-2 text-sm font-medium text-[#666666] bg-[#F2F3F0] rounded-xl hover:bg-[#E7E8E5] transition-colors">
                Отмена
              </button>
              <button onClick={handleUpload} disabled={uploading || !uploadTitle || !uploadFile}
                className="flex-1 py-2 text-sm font-medium text-white bg-[#6366F1] rounded-xl hover:bg-[#4F46E5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {uploading ? 'Загружаем...' : 'Загрузить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
