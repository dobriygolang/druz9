import { useState } from 'react'
import { authApi } from '@/features/Auth/api/authApi'
import { useAuth } from '@/app/providers/AuthProvider'
import { useNavigate } from 'react-router-dom'
import { Spinner } from '@/shared/ui/Spinner'

export function LoginPage() {
  const { refresh } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
      const poll = setInterval(async () => {
        try {
          await refresh()
          clearInterval(poll)
          navigate('/home')
        } catch {}
      }, 2000)
      setTimeout(() => clearInterval(poll), 120000)
    } catch {
      setError('Ошибка авторизации')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F2F3F0] flex items-center justify-center">
      <div className="w-full max-w-[400px] mx-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#FF8400] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
              <path d="M4 20L12 4L20 20" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M7 14H17" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="font-mono text-2xl font-bold text-[#FF8400] tracking-widest">LUNARIS</h1>
          <p className="text-sm text-[#64748b] mt-2">Сообщество разработчиков</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-[#CBCCC9] p-8">
          <h2 className="text-xl font-bold text-[#18181b] mb-2">Добро пожаловать</h2>
          <p className="text-sm text-[#64748b] mb-6">Войдите, чтобы продолжить</p>

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
  )
}
