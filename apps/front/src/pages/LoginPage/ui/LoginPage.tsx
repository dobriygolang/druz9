import { useState, useRef } from 'react'
import { authApi } from '@/features/Auth/api/authApi'
import { useAuth } from '@/app/providers/AuthProvider'
import { useNavigate } from 'react-router-dom'
import { Spinner } from '@/shared/ui/Spinner'
import { Swords, Code2, BookOpen, Calendar, Flame, ArrowLeft } from 'lucide-react'

/* ── Brand mark (network graph) ───────────────────────────── */
function LogoMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 20 20" fill="none">
      <line x1="5" y1="6" x2="15" y2="6"  stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeOpacity="0.65"/>
      <line x1="5" y1="6" x2="10" y2="15" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeOpacity="0.65"/>
      <line x1="15" y1="6" x2="10" y2="15" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeOpacity="0.65"/>
      <circle cx="5"  cy="6"  r="2.4" fill="white"/>
      <circle cx="15" cy="6"  r="2.4" fill="white"/>
      <circle cx="10" cy="15" r="2.4" fill="white"/>
    </svg>
  )
}

/* ── Yandex icon ────────────────────────────────────────────── */
function YandexIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#fc3f1d">
      <path d="M12.5 2h-1.7C7.9 2 6.1 4.3 6.1 7.1c0 2.5 1.1 3.9 3.2 5.1L6.1 22h3.4l3-9.3h.7V22H16V2h-3.5zm0 7.9h-.8c-1.5 0-2.2-.9-2.2-2.8 0-1.9.7-2.8 2.2-2.8h.8v5.6z" />
    </svg>
  )
}

/* ── Telegram icon ──────────────────────────────────────────── */
function TelegramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#2AABEE">
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.917 7.049-1.833 8.632c-.135.601-.495.748-.999.466l-2.75-2.026-1.328 1.278c-.146.146-.269.269-.552.269l.197-2.795 5.082-4.591c.22-.197-.049-.307-.342-.11l-6.283 3.953-2.706-.847c-.588-.183-.599-.588.123-.87l10.564-4.073c.489-.176.918.12.827.714z" />
    </svg>
  )
}

const FEATURES = [
  { icon: Swords,   label: 'Arena Duels',    desc: '1v1 for ELO' },
  { icon: Code2,    label: 'Code Rooms',     desc: 'Collaborative coding' },
  { icon: BookOpen, label: 'Mock Interviews',desc: 'AI review' },
  { icon: Calendar, label: 'Events',         desc: 'Clubs and meetups' },
  { icon: Flame,    label: 'Daily',          desc: 'Task of the day' },
]

export function LoginPage() {
  const { refresh } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [loadingProvider, setLoadingProvider] = useState<'yandex' | 'telegram' | null>(null)
  const [error, setError] = useState('')

  // Telegram code entry flow
  const [telegramStep, setTelegramStep] = useState<'idle' | 'code'>('idle')
  const [telegramToken, setTelegramToken] = useState('')
  const [telegramCode, setTelegramCode] = useState('')
  const [submittingCode, setSubmittingCode] = useState(false)
  const codeInputRef = useRef<HTMLInputElement>(null)

  const handleYandex = async () => {
    setLoading(true); setLoadingProvider('yandex'); setError('')
    try {
      const { authUrl } = await authApi.startYandexAuth()
      window.location.href = authUrl
    } catch {
      setError('Authorization failed. Try again.')
      setLoading(false); setLoadingProvider(null)
    }
  }

  const handleTelegram = async () => {
    setLoading(true); setLoadingProvider('telegram'); setError('')
    try {
      const { token, botStartUrl } = await authApi.createTelegramAuthChallenge()
      window.open(botStartUrl, '_blank')
      setTelegramToken(token)
      setTelegramCode('')
      setTelegramStep('code')
      setTimeout(() => codeInputRef.current?.focus(), 100)
    } catch {
      setError('Authorization failed. Try again.')
    } finally {
      setLoading(false); setLoadingProvider(null)
    }
  }

  const handleTelegramCodeSubmit = async () => {
    const code = telegramCode.trim()
    if (code.length < 4) return
    setSubmittingCode(true); setError('')
    try {
      await authApi.telegramLogin(telegramToken, code)
      await refresh()
      navigate('/home')
    } catch {
      setError('Invalid code. Try again.')
      setSubmittingCode(false)
    }
  }

  const handleTelegramBack = () => {
    setTelegramStep('idle')
    setTelegramToken('')
    setTelegramCode('')
    setError('')
  }

  return (
    <div className="relative flex min-h-screen items-start justify-center overflow-hidden bg-[#F2F3F0] px-4 py-6 sm:items-center sm:py-0">

      {/* Ambient glow */}
      <div className="absolute -top-32 -right-32 w-[520px] h-[520px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 65%)' }} />
      <div className="absolute -bottom-32 -left-32 w-[440px] h-[440px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 60%)' }} />

      {/* Dot grid */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #CBCCC9 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          opacity: 0.55,
        }} />

      {/* Card */}
      <div className="relative z-10 w-full max-w-[420px]" style={{ animation: 'fadeSlideUp 0.35s ease both' }}>

        {/* Card header — indigo gradient */}
        <div className="rounded-t-2xl px-6 pt-7 pb-7 sm:px-8 sm:pt-8 sm:pb-8"
          style={{ background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)' }}>

          {/* Logo row */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 flex items-center justify-center">
              <LogoMark />
            </div>
            {/* DRUZYA — Geist (sans), tight, bold */}
            <span className="text-white font-bold tracking-[0.22em] text-[15px] uppercase"
              style={{ fontFamily: 'Geist, Inter, system-ui, sans-serif', letterSpacing: '0.22em' }}>
              DRUZYA
            </span>
          </div>

          <h1 className="text-[21px] font-bold text-white leading-tight mb-1">
            Welcome
          </h1>
          <p className="text-sm text-white/60">
            A platform for interview preparation
          </p>
        </div>

        {/* Card body — white */}
        <div className="rounded-b-2xl bg-white px-5 py-6 shadow-[0_12px_48px_rgba(0,0,0,0.08)] sm:px-8 sm:py-7">

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
              {error}
            </div>
          )}

          {telegramStep === 'code' ? (
            /* ── Telegram code entry ─────────────────────────── */
            <div className="flex flex-col gap-4">
              <button
                onClick={handleTelegramBack}
                className="flex items-center gap-1.5 text-sm text-[#6366F1] hover:text-[#4F46E5] transition-colors self-start -mb-1"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <div className="text-sm text-[#0f172a]">
                <p className="font-medium mb-1">Enter the code from Telegram</p>
                <p className="text-[#94a3b8] text-xs">
                  We sent the code to the bot. Enter it below to sign in.
                </p>
              </div>

              <input
                ref={codeInputRef}
                type="text"
                inputMode="numeric"
                maxLength={8}
                placeholder="Code from the bot"
                value={telegramCode}
                onChange={(e) => setTelegramCode(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => { if (e.key === 'Enter') handleTelegramCodeSubmit() }}
                disabled={submittingCode}
                className="w-full px-4 py-3.5 rounded-xl text-sm text-[#111111] bg-white border border-[#CBCCC9] focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20 outline-none transition-all disabled:opacity-40"
              />

              <button
                onClick={handleTelegramCodeSubmit}
                disabled={submittingCode || telegramCode.trim().length < 4}
                className="flex items-center justify-center gap-2 w-full px-4 py-3.5 rounded-xl font-medium text-sm text-white transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)' }}
              >
                {submittingCode ? <Spinner size="sm" /> : null}
                {submittingCode ? 'Checking...' : 'Sign in'}
              </button>
            </div>
          ) : (
            /* ── Provider buttons ────────────────────────────── */
            <div className="flex flex-col gap-2.5">
              {/* Yandex — site style */}
              <button
                onClick={handleYandex}
                disabled={loading}
                className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl font-medium text-sm text-[#111111] bg-white border border-[#CBCCC9] hover:bg-[#F2F3F0] transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {loadingProvider === 'yandex'
                  ? <Spinner size="sm" />
                  : <span className="w-5 h-5 flex items-center justify-center flex-shrink-0"><YandexIcon /></span>}
                <span className="flex-1 text-center">Continue with Yandex</span>
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-[#E7E8E5]" />
                <span className="text-[11px] text-[#94a3b8] font-medium tracking-wide">OR</span>
                <div className="flex-1 h-px bg-[#E7E8E5]" />
              </div>

              {/* Telegram — site style */}
              <button
                onClick={handleTelegram}
                disabled={loading}
                className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl font-medium text-sm text-[#111111] bg-white border border-[#CBCCC9] hover:bg-[#F2F3F0] transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {loadingProvider === 'telegram'
                  ? <Spinner size="sm" />
                  : <span className="w-5 h-5 flex items-center justify-center flex-shrink-0"><TelegramIcon /></span>}
                <span className="flex-1 text-center">Continue with Telegram</span>
              </button>
            </div>
          )}

          {/* Divider */}
          <div className="h-px bg-[#F2F3F0] my-6" />

          {/* Feature grid */}
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 sm:gap-2">
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex flex-col items-center gap-1.5 group cursor-default">
                <div className="w-9 h-9 rounded-xl bg-[#EEF2FF] flex items-center justify-center transition-colors group-hover:bg-[#E0E7FF]">
                  <Icon className="w-4 h-4 text-[#6366F1]" />
                </div>
                <p className="text-[9px] font-semibold text-[#0f172a] text-center leading-tight">{label}</p>
                <p className="text-[8px] text-[#94a3b8] text-center leading-tight">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-[11px] text-[#94a3b8] mt-4">
          Join the developer community
        </p>
      </div>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
