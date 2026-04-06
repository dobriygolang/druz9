import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import type { Podcast } from '@/entities/Podcast/model/types'
import { podcastApi } from '@/features/Podcast/api/podcastApi'

interface AudioPlayerContextValue {
  playing: Podcast | null
  isPlaying: boolean
  progress: number   // 0–100
  currentTime: number // seconds
  duration: number    // seconds
  speed: number
  play: (podcast: Podcast) => Promise<void>
  pause: () => void
  resume: () => void
  stop: () => void
  seek: (pct: number) => void
  setSpeed: (rate: number) => void
}

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null)

export function useAudioPlayer() {
  const ctx = useContext(AudioPlayerContext)
  if (!ctx) throw new Error('useAudioPlayer must be inside AudioPlayerProvider')
  return ctx
}

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const [playing, setPlaying] = useState<Podcast | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speed, setSpeedState] = useState(1)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const speedRef = useRef(1)
  const playingIdRef = useRef<string | null>(null)

  const clearTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }

  const play = useCallback(async (podcast: Podcast) => {
    // Toggle pause/resume if same podcast
    if (playingIdRef.current === podcast.id && audioRef.current) {
      if (audioRef.current.paused) {
        await audioRef.current.play()
        setIsPlaying(true)
      } else {
        audioRef.current.pause()
        setIsPlaying(false)
      }
      return
    }

    // Stop previous track
    clearTimer()
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    playingIdRef.current = podcast.id

    try {
      const { streamUrl } = await podcastApi.play(podcast.id)
      const audio = new Audio(streamUrl)
      audio.playbackRate = speedRef.current
      audioRef.current = audio

      audio.addEventListener('loadedmetadata', () => {
        setDuration(Math.floor(audio.duration) || 0)
      })
      audio.addEventListener('ended', () => {
        clearTimer()
        setIsPlaying(false)
        setProgress(0)
        setCurrentTime(0)
      })

      await audio.play()
      setPlaying(podcast)
      setIsPlaying(true)
      setProgress(0)
      setCurrentTime(0)
      setDuration(Math.floor(audio.duration) || 0)

      timerRef.current = setInterval(() => {
        if (audioRef.current?.duration) {
          setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100)
          setCurrentTime(Math.floor(audioRef.current.currentTime))
          setDuration(Math.floor(audioRef.current.duration))
        }
      }, 500)
    } catch {
      playingIdRef.current = null
    }
  }, [])

  const pause = useCallback(() => {
    audioRef.current?.pause()
    setIsPlaying(false)
  }, [])

  const resume = useCallback(() => {
    audioRef.current?.play()
    setIsPlaying(true)
  }, [])

  const stop = useCallback(() => {
    clearTimer()
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    playingIdRef.current = null
    setPlaying(null)
    setIsPlaying(false)
    setProgress(0)
    setCurrentTime(0)
    setDuration(0)
    setSpeedState(1)
    speedRef.current = 1
  }, [])

  const seek = useCallback((pct: number) => {
    if (!audioRef.current?.duration) return
    const time = (pct / 100) * audioRef.current.duration
    audioRef.current.currentTime = time
    setCurrentTime(Math.floor(time))
    setProgress(pct)
  }, [])

  const setSpeed = useCallback((rate: number) => {
    speedRef.current = rate
    if (audioRef.current) audioRef.current.playbackRate = rate
    setSpeedState(rate)
  }, [])

  return (
    <AudioPlayerContext.Provider value={{ playing, isPlaying, progress, currentTime, duration, speed, play, pause, resume, stop, seek, setSpeed }}>
      {children}
    </AudioPlayerContext.Provider>
  )
}
