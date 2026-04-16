import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { authApi } from '@/features/Auth/api/authApi'
import { useAuth } from '@/app/providers/AuthProvider'
import { useNavigate } from 'react-router-dom'
import { Spinner } from '@/shared/ui/Spinner'
import { PixelGardener } from '@/shared/ui/PixelGardener'
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

/* ── Leaf pattern SVG for background ─────────────────────── */
function LeafPattern() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.04]">
      <svg width="100%" height="100%">
        <defs>
          <pattern id="leaf-grid" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
            <path d="M20 10C14 14 12 22 10 30l2 1 1-3c2 0 6-4 8-10 0-2-0.5-3-1-3s-1 1-1 1"
              fill="currentColor" transform="rotate(30, 20, 20)" />
            <path d="M60 50C54 54 52 62 50 70l2 1 1-3c2 0 6-4 8-10 0-2-0.5-3-1-3s-1 1-1 1"
              fill="currentColor" transform="rotate(-15, 60, 60)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#leaf-grid)" />
      </svg>
    </div>
  )
}

export function LoginPage() {
  const { t } = useTranslation()
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
  const features = [
    { icon: Swords, label: t('login.feature.arena'), desc: t('login.feature.arenaDesc') },
    { icon: Code2, label: t('login.feature.rooms'), desc: t('login.feature.roomsDesc') },
    { icon: BookOpen, label: t('login.feature.mock'), desc: t('login.feature.mockDesc') },
    { icon: Calendar, label: t('login.feature.events'), desc: t('login.feature.eventsDesc') },
    { icon: Flame, label: t('login.feature.daily'), desc: t('login.feature.dailyDesc') },
  ]

  const handleYandex = async () => {
    setLoading(true); setLoadingProvider('yandex'); setError('')
    try {
      const { authUrl } = await authApi.startYandexAuth()
      window.location.href = authUrl
    } catch {
      setError(t('login.error.authFailed'))
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
      setError(t('login.error.authFailed'))
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
      setError(t('login.error.invalidCode'))
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
    <div className="relative flex min-h-screen items-start justify-center overflow-hidden bg-[#F0F5F1] dark:bg-[#0B1210] px-4 py-6 sm:items-center sm:py-0">

      {/* Ambient glows — breathing animation */}
      <div className="absolute -top-32 -right-32 w-[520px] h-[520px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(5,150,105,0.12) 0%, transparent 65%)', animation: 'glow-breathe 6s ease-in-out infinite' }} />
      <div className="absolute -bottom-32 -left-32 w-[440px] h-[440px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(13,148,136,0.08) 0%, transparent 60%)', animation: 'glow-breathe 8s ease-in-out infinite 2s' }} />

      {/* Leaf pattern instead of dots */}
      <LeafPattern />

      {/* Main content — mascot + card */}
      <div className="relative z-10 flex items-center gap-8 w-full max-w-[640px]">

        {/* Pixel gardener mascot — desktop only */}
        <div className="hidden md:flex flex-col items-center gap-3 flex-shrink-0">
          <PixelGardener mood="idle" size={96} />
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-bold text-[#059669] dark:text-[#34D399] tracking-widest uppercase"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              LEVEL 1
            </span>
            <span className="text-[9px] text-[#7A9982] dark:text-[#4A7058]">
              Gardener
            </span>
          </div>
          {/* Pixel ground */}
          <div className="flex gap-px mt-1">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="w-3 h-3 pixel-border"
                style={{ backgroundColor: i % 3 === 0 ? '#059669' : i % 3 === 1 ? '#10B981' : '#34D399' }} />
            ))}
          </div>
        </div>

        {/* Login card with notch shape */}
        <div className="w-full max-w-[420px] card-notch" style={{ animation: 'fadeSlideUp 0.35s ease both' }}>

          {/* Card header — green gradient with notch */}
          <div className="card-notch px-6 pt-7 pb-7 sm:px-8 sm:pt-8 sm:pb-8"
            style={{ background: 'linear-gradient(135deg, #059669 0%, #0D9488 100%)' }}>

            {/* Logo row */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 flex items-center justify-center pixel-border rounded-lg"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                <LogoMark />
              </div>
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

          {/* Card body */}
          <div className="bg-white dark:bg-[#132420] px-5 py-6 shadow-[0_12px_48px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_48px_rgba(0,0,0,0.4)] sm:px-8 sm:py-7"
            style={{ borderRadius: '0 0 16px 16px' }}>

            {error && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-[#2a0f0f] border border-red-200 dark:border-red-900 text-red-600 dark:text-[#f87171] text-sm">
                {error}
              </div>
            )}

            {telegramStep === 'code' ? (
              /* ── Telegram code entry ─────────────────────────── */
              <div className="flex flex-col gap-4">
                <button
                  onClick={handleTelegramBack}
                  className="flex items-center gap-1.5 text-sm text-[#059669] dark:text-[#34D399] hover:text-[#047857] dark:hover:text-[#6EE7B7] transition-colors self-start -mb-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t('common.back')}
                </button>

                <div className="text-sm text-[#0B1210] dark:text-[#E2F0E8]">
                  <p className="font-medium mb-1">{t('login.telegram.title')}</p>
                  <p className="text-[#7A9982] dark:text-[#4A7058] text-xs">
                    {t('login.telegram.subtitle')}
                  </p>
                </div>

                <input
                  ref={codeInputRef}
                  type="text"
                  inputMode="numeric"
                  maxLength={8}
                  placeholder={t('login.telegram.placeholder')}
                  value={telegramCode}
                  onChange={(e) => setTelegramCode(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleTelegramCodeSubmit() }}
                  disabled={submittingCode}
                  className="w-full px-4 py-3.5 rounded-xl text-sm text-[#111111] dark:text-[#E2F0E8] bg-white dark:bg-[#1A3028] border border-[#C1CFC4] dark:border-[#1E4035] focus:border-[#059669] dark:focus:border-[#34D399] focus:ring-2 focus:ring-[#059669]/20 dark:focus:ring-[#34D399]/20 outline-none transition-all disabled:opacity-40"
                />

                <button
                  onClick={handleTelegramCodeSubmit}
                  disabled={submittingCode || telegramCode.trim().length < 4}
                  className="btn-game btn-ripple flex items-center justify-center gap-2 w-full px-4 py-3.5 font-medium text-sm text-white transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg, #059669 0%, #0D9488 100%)' }}
                >
                  {submittingCode ? <Spinner size="sm" /> : null}
                  {submittingCode ? t('login.telegram.checking') : t('login.telegram.submit')}
                </button>
              </div>
            ) : (
              /* ── Provider buttons ────────────────────────────── */
              <div className="flex flex-col gap-2.5">
                {/* Yandex */}
                <button
                  onClick={handleYandex}
                  disabled={loading}
                  className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl font-medium text-sm text-[#111111] dark:text-[#E2F0E8] bg-white dark:bg-[#1A3028] border border-[#C1CFC4] dark:border-[#1E4035] hover:bg-[#E6F0E8] dark:hover:bg-[#162E24] transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  {loadingProvider === 'yandex'
                    ? <Spinner size="sm" />
                    : <span className="w-5 h-5 flex items-center justify-center flex-shrink-0"><YandexIcon /></span>}
                  <span className="flex-1 text-center">{t('login.provider.yandex')}</span>
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-[#D1E7D5] dark:bg-[#1E4035]" />
                  <span className="text-[11px] text-[#7A9982] dark:text-[#4A7058] font-medium tracking-wide">{t('login.or')}</span>
                  <div className="flex-1 h-px bg-[#D1E7D5] dark:bg-[#1E4035]" />
                </div>

                {/* Telegram */}
                <button
                  onClick={handleTelegram}
                  disabled={loading}
                  className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl font-medium text-sm text-[#111111] dark:text-[#E2F0E8] bg-white dark:bg-[#1A3028] border border-[#C1CFC4] dark:border-[#1E4035] hover:bg-[#E6F0E8] dark:hover:bg-[#162E24] transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  {loadingProvider === 'telegram'
                    ? <Spinner size="sm" />
                    : <span className="w-5 h-5 flex items-center justify-center flex-shrink-0"><TelegramIcon /></span>}
                  <span className="flex-1 text-center">{t('login.provider.telegram')}</span>
                </button>
              </div>
            )}

            {/* Divider */}
            <div className="h-px bg-[#D1E7D5] dark:bg-[#1E4035] my-6" />

            {/* Feature grid — pixel style icons */}
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 sm:gap-2">
              {features.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex flex-col items-center gap-1.5 group cursor-default">
                  <div className="w-9 h-9 rounded-lg bg-[#ecfdf5] dark:bg-[#0d2a1f] pixel-border flex items-center justify-center transition-colors group-hover:bg-[#d1fae5] dark:group-hover:bg-[#1A3028]">
                    <Icon className="w-4 h-4 text-[#059669] dark:text-[#34D399]" />
                  </div>
                  <p className="text-[9px] font-semibold text-[#111111] dark:text-[#E2F0E8] text-center leading-tight">{label}</p>
                  <p className="text-[8px] text-[#7A9982] dark:text-[#4A7058] text-center leading-tight">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-[11px] text-[#7A9982] dark:text-[#4A7058] mt-4">
            {t('login.footer')}
          </p>
        </div>
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
