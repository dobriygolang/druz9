import { useState, useRef, useEffect } from 'react'
import { authApi } from '@/features/Auth/api/authApi'
import { useAuth } from '@/app/providers/AuthProvider'
import { useNavigate } from 'react-router-dom'
import { Spinner } from '@/shared/ui/Spinner'
import { Swords, Code2, BookOpen, Calendar, Mic } from 'lucide-react'

const FEATURES = [
  {
    icon: Swords,
    title: 'Arena Duels',
    desc: 'Соревнуйся 1 на 1 в алгоритмах за ELO',
  },
  {
    icon: Code2,
    title: 'Code Rooms',
    desc: 'Песочница для совместного кодинга в реальном времени',
  },
  {
    icon: BookOpen,
    title: 'Mock Interviews',
    desc: 'Полный цикл: Go, SQL, System Design с AI-проверкой',
  },
  {
    icon: Calendar,
    title: 'Ивенты и клубы',
    desc: 'Техкниги, LeetCode, встречи офлайн',
  },
  {
    icon: Mic,
    title: 'Подкасты',
    desc: 'Слушай лучших разработчиков',
  },
]

export function LoginPage() {
  const { refresh } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  const handleYandex = async () => {
    setLoading(true)
    setError('')
    try {
      const { authUrl } = await authApi.startYandexAuth()
      window.location.href = authUrl
    } catch (e: any) {
      setError('Ошибка авторизации')
      setLoading(false)
    }
  }

  const handleTelegram = async () => {
    setLoading(true)
    setError('')
    try {
      const { botStartUrl } = await authApi.createTelegramAuthChallenge()
      window.open(botStartUrl, '_blank')
      // Poll for auth completion
      if (pollRef.current) clearInterval(pollRef.current)
      const poll = setInterval(async () => {
        try {
          await refresh()
          if (pollRef.current) clearInterval(pollRef.current)
          pollRef.current = null
          navigate('/home')
        } catch {}
      }, 2000)
      pollRef.current = poll
      setTimeout(() => {
        if (pollRef.current) clearInterval(pollRef.current)
        pollRef.current = null
      }, 120000)
    } catch {
      setError('Ошибка авторизации')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left info panel */}
      <div className="flex-1 bg-[#0f172a] flex flex-col justify-between px-12 py-10">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-[#FF8400] rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg leading-none">Д</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-xl font-bold text-[#FF8400] tracking-widest">ДРУЗЬЯ</span>
              <span className="text-xs text-[#64748b]">v2.0.0</span>
            </div>
          </div>

          {/* Tagline */}
          <h2 className="text-xl text-white leading-snug mb-10">
            Платформа для подготовки разработчиков к собеседованиям
          </h2>

          {/* Feature rows */}
          <div className="flex flex-col gap-5">
            {FEATURES.map((f) => {
              const Icon = f.icon
              return (
                <div key={f.title} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#1e293b] flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-[#FF8400]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{f.title}</p>
                    <p className="text-xs text-[#94a3b8] mt-0.5 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Bottom text */}
        <p className="text-sm text-[#64748b] mt-8">
          Присоединяйтесь к сообществу разработчиков
        </p>
      </div>

      {/* Right auth panel */}
      <div className="w-[480px] bg-white flex items-center justify-center flex-shrink-0">
        <div className="w-full max-w-[360px] mx-auto px-6">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-[#FF8400] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl leading-none">Д</span>
            </div>
            <h1 className="font-mono text-2xl font-bold text-[#FF8400] tracking-widest">ДРУЗЬЯ</h1>
          </div>

          {/* Auth card */}
          <div>
            <h2 className="text-xl font-bold text-[#111111] mb-1 text-center">Добро пожаловать</h2>
            <p className="text-sm text-[#666666] mb-6 text-center">Войдите, чтобы продолжить</p>

            {error && (
              <div className="mb-4 p-3 bg-[#fef2f2] border border-[#fca5a5] rounded-lg text-sm text-[#dc2626]">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={handleYandex}
                disabled={loading}
                className="flex items-center justify-center gap-3 w-full px-4 py-3 bg-[#fc3f1d] hover:bg-[#e5381a] text-white rounded-xl font-medium text-sm transition-colors disabled:opacity-50"
              >
                {loading ? <Spinner size="sm" /> : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.5 2h-1.7C7.9 2 6.1 4.3 6.1 7.1c0 2.5 1.1 3.9 3.2 5.1L6.1 22h3.4l3-9.3h.7V22H16V2h-3.5zm0 7.9h-.8c-1.5 0-2.2-.9-2.2-2.8 0-1.9.7-2.8 2.2-2.8h.8v5.6z"/>
                  </svg>
                )}
                Войти через Яндекс
              </button>

              <button
                onClick={handleTelegram}
                disabled={loading}
                className="flex items-center justify-center gap-3 w-full px-4 py-3 bg-[#2AABEE] hover:bg-[#229ed9] text-white rounded-xl font-medium text-sm transition-colors disabled:opacity-50"
              >
                {loading ? <Spinner size="sm" /> : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.917 7.049-1.833 8.632c-.135.601-.495.748-.999.466l-2.75-2.026-1.328 1.278c-.146.146-.269.269-.552.269l.197-2.795 5.082-4.591c.22-.197-.049-.307-.342-.11l-6.283 3.953-2.706-.847c-.588-.183-.599-.588.123-.87l10.564-4.073c.489-.176.918.12.827.714z"/>
                  </svg>
                )}
                Войти через Telegram
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
