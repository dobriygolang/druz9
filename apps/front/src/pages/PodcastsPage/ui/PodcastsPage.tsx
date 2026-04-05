import { useEffect, useState, useRef, useCallback } from 'react'
import { Mic, Play, Pause, Search, Upload, X } from 'lucide-react'
import { podcastApi } from '@/features/Podcast/api/podcastApi'
import type { Podcast } from '@/entities/Podcast/model/types'
import { Card } from '@/shared/ui/Card'
import { Badge } from '@/shared/ui/Badge'
import { ErrorState } from '@/shared/ui/ErrorState'
import { useAuth } from '@/app/providers/AuthProvider'
import { apiClient } from '@/shared/api/base'

const CATEGORY_FILTERS = ['Все', 'Технологии', 'Карьера', 'Архитектура', 'DevOps']

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
  const [podcasts, setPodcasts] = useState<Podcast[]>([])
  const [activeFilter, setActiveFilter] = useState('Все')
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadAuthor, setUploadAuthor] = useState('')
  const [uploadDesc, setUploadDesc] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  // Player state
  const [playing, setPlaying] = useState<Podcast | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchPodcasts = useCallback(() => {
    setError(null)
    podcastApi.list({ limit: 50 })
      .then(r => setPodcasts(r.podcasts))
      .catch(() => setError('Не удалось загрузить данные'))
  }, [])

  useEffect(() => {
    fetchPodcasts()
    return () => {
      if (progressTimer.current) clearInterval(progressTimer.current)
    }
  }, [fetchPodcasts])

  const handlePlay = useCallback(async (podcast: Podcast) => {
    // Stop current playback
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (progressTimer.current) {
      clearInterval(progressTimer.current)
      progressTimer.current = null
    }

    if (playing?.id === podcast.id && isPlaying) {
      setIsPlaying(false)
      setPlaying(null)
      return
    }

    try {
      const { streamUrl } = await podcastApi.play(podcast.id)
      const audio = new Audio(streamUrl)
      audioRef.current = audio

      audio.addEventListener('ended', () => {
        setIsPlaying(false)
        setProgress(0)
        setCurrentTime(0)
        if (progressTimer.current) clearInterval(progressTimer.current)
      })

      await audio.play()
      setPlaying(podcast)
      setIsPlaying(true)
      setProgress(0)
      setCurrentTime(0)

      progressTimer.current = setInterval(() => {
        if (audio.duration) {
          setProgress((audio.currentTime / audio.duration) * 100)
          setCurrentTime(Math.floor(audio.currentTime))
        }
      }, 500)
    } catch {
      // Playback failed
    }
  }, [playing, isPlaying])

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }, [isPlaying])

  const filtered = podcasts.filter(p => {
    if (search && !p.title.toLowerCase().includes(search.toLowerCase()) && !p.authorName.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const handleUpload = async () => {
    if (!uploadTitle || !uploadAuthor || !uploadFile) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('title', uploadTitle)
      form.append('authorName', uploadAuthor)
      form.append('description', uploadDesc)
      form.append('file', uploadFile)
      await apiClient.post('/api/v1/podcasts', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      setShowUpload(false)
      setUploadTitle(''); setUploadAuthor(''); setUploadDesc(''); setUploadFile(null)
      fetchPodcasts()
    } catch {
      // silently keep open
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
          {playing && (
            <div className="bg-[#0f172a] rounded-2xl p-6 flex items-center gap-5 animate-fade-in">
              <div
                className="w-[120px] h-[120px] rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `linear-gradient(135deg, #6366F1, #f59e0b)` }}
              >
                <Mic className="w-12 h-12 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-[#6366F1] font-medium tracking-wider font-geist uppercase">Сейчас играет</p>
                <h3 className="font-mono text-lg font-bold text-white mt-1 truncate">{playing.title}</h3>
                <p className="text-sm text-[#94a3b8] font-geist mt-0.5">
                  {playing.authorName} · {formatDuration(playing.durationSeconds)}
                </p>
                <div className="flex items-center gap-3 mt-3">
                  <button
                    onClick={togglePlayPause}
                    className="w-10 h-10 rounded-full bg-[#6366F1] flex items-center justify-center hover:bg-[#ea7700] transition-colors"
                  >
                    {isPlaying ? <Pause className="w-[18px] h-[18px] text-white" /> : <Play className="w-[18px] h-[18px] text-white ml-0.5" />}
                  </button>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 h-1 bg-[#1e293b] rounded-full overflow-hidden">
                      <div className="h-full bg-[#6366F1] rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-[11px] font-mono text-[#666666] w-[90px] text-right">
                      {formatDuration(currentTime)} / {formatDuration(playing.durationSeconds)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filter pills + episode list header */}
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-base font-semibold text-[#111111]">
              {playing ? 'Последние эпизоды' : 'Все подкасты'}
            </h2>
            <div className="flex gap-2">
              {CATEGORY_FILTERS.map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                    activeFilter === f
                      ? 'bg-[#6366F1] text-[#111111]'
                      : 'bg-white border border-[#CBCCC9] text-[#666666] hover:border-[#94a3b8]'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

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
                const isCurrentlyPlaying = playing?.id === podcast.id
                return (
                  <button
                    key={podcast.id}
                    onClick={() => handlePlay(podcast)}
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
                      {isCurrentlyPlaying && isPlaying ? (
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
                        {isCurrentlyPlaying && isPlaying ? (
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
              <button onClick={() => setShowUpload(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F2F3F0] text-[#666666]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-medium text-[#666666] mb-1 block">Название *</label>
                <input value={uploadTitle} onChange={e => setUploadTitle(e.target.value)}
                  placeholder="Название подкаста"
                  className="w-full px-3 py-2 text-sm border border-[#CBCCC9] rounded-lg focus:outline-none focus:border-[#6366F1]" />
              </div>
              <div>
                <label className="text-xs font-medium text-[#666666] mb-1 block">Автор *</label>
                <input value={uploadAuthor} onChange={e => setUploadAuthor(e.target.value)}
                  placeholder="Имя автора"
                  className="w-full px-3 py-2 text-sm border border-[#CBCCC9] rounded-lg focus:outline-none focus:border-[#6366F1]" />
              </div>
              <div>
                <label className="text-xs font-medium text-[#666666] mb-1 block">Описание</label>
                <textarea value={uploadDesc} onChange={e => setUploadDesc(e.target.value)}
                  placeholder="Краткое описание"
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-[#CBCCC9] rounded-lg focus:outline-none focus:border-[#6366F1] resize-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-[#666666] mb-1 block">Аудиофайл * (mp3, m4a)</label>
                <input type="file" accept="audio/*"
                  onChange={e => setUploadFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-[#666666] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[#EEF2FF] file:text-[#6366F1] hover:file:bg-[#E0E7FF]" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowUpload(false)}
                className="flex-1 py-2 text-sm font-medium text-[#666666] bg-[#F2F3F0] rounded-xl hover:bg-[#E7E8E5] transition-colors">
                Отмена
              </button>
              <button onClick={handleUpload} disabled={uploading || !uploadTitle || !uploadAuthor || !uploadFile}
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
