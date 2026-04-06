import { Mic, Pause, Play, X } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useAudioPlayer } from '@/features/Podcast/providers/AudioPlayerProvider'

const SPEEDS = [0.75, 1, 1.25, 1.5, 2]

function fmt(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function AudioPlayerBar() {
  const { playing, isPlaying, progress, currentTime, duration, speed, pause, resume, stop, seek, setSpeed } = useAudioPlayer()
  const location = useLocation()

  // Hide on podcasts page — the page has its own full player
  if (!playing || location.pathname === '/podcasts') return null

  const handleBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = ((e.clientX - rect.left) / rect.width) * 100
    seek(Math.max(0, Math.min(100, pct)))
  }

  const cycleSpeed = () => {
    const idx = SPEEDS.indexOf(speed)
    setSpeed(SPEEDS[(idx + 1) % SPEEDS.length])
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0f172a]/95 backdrop-blur border-t border-[#1e293b] h-[68px] flex items-center gap-3 px-4 md:px-6 mb-[64px] md:mb-0 animate-fade-in">
      {/* Album art + info */}
      <div className="flex items-center gap-3 w-[180px] md:w-[240px] flex-shrink-0 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#6366F1] to-[#f59e0b] flex items-center justify-center flex-shrink-0">
          <Mic className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-white truncate leading-tight">{playing.title}</p>
          <p className="text-[11px] text-[#475569] truncate mt-0.5">{playing.authorName}</p>
        </div>
      </div>

      {/* Progress + time */}
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <div
          className="h-1.5 bg-[#1e293b] rounded-full cursor-pointer group relative"
          onClick={handleBarClick}
        >
          <div
            className="h-full bg-[#6366F1] rounded-full relative transition-all duration-300"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
        <div className="flex justify-between">
          <span className="text-[10px] font-mono text-[#475569]">{fmt(currentTime)}</span>
          <span className="text-[10px] font-mono text-[#475569]">{fmt(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Speed */}
        <button
          onClick={cycleSpeed}
          className="px-2 py-1 text-[11px] font-bold text-[#64748b] hover:text-white bg-[#1e293b] hover:bg-[#263148] rounded-md transition-colors min-w-[40px] text-center"
        >
          {speed === 1 ? '1×' : `${speed}×`}
        </button>

        {/* Play / Pause */}
        <button
          onClick={isPlaying ? pause : resume}
          className="w-9 h-9 rounded-full bg-[#6366F1] hover:bg-[#4F46E5] flex items-center justify-center transition-colors"
        >
          {isPlaying
            ? <Pause className="w-4 h-4 text-white" />
            : <Play className="w-4 h-4 text-white ml-0.5" />
          }
        </button>

        {/* Close */}
        <button
          onClick={stop}
          className="w-7 h-7 rounded-full hover:bg-[#1e293b] flex items-center justify-center transition-colors"
          title="Закрыть плеер"
        >
          <X className="w-3.5 h-3.5 text-[#475569] hover:text-white" />
        </button>
      </div>
    </div>
  )
}
