import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { authApi } from '@/features/Auth/api/authApi'
import { useAuth } from '@/app/providers/AuthProvider'
import { Panel, RpgButton } from '@/shared/ui/pixel'
import {
  Hero,
  Torch,
  Fireflies,
  Bookshelf,
  Chest,
  PixelCoin,
  Sword,
  RoomScene,
} from '@/shared/ui/sprites'

function YandexIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#fc3f1d">
      <path d="M12.5 2h-1.7C7.9 2 6.1 4.3 6.1 7.1c0 2.5 1.1 3.9 3.2 5.1L6.1 22h3.4l3-9.3h.7V22H16V2h-3.5zm0 7.9h-.8c-1.5 0-2.2-.9-2.2-2.8 0-1.9.7-2.8 2.2-2.8h.8v5.6z" />
    </svg>
  )
}

function TelegramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#2AABEE">
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.917 7.049-1.833 8.632c-.135.601-.495.748-.999.466l-2.75-2.026-1.328 1.278c-.146.146-.269.269-.552.269l.197-2.795 5.082-4.591c.22-.197-.049-.307-.342-.11l-6.283 3.953-2.706-.847c-.588-.183-.599-.588.123-.87l10.564-4.073c.489-.176.918.12.827.714z" />
    </svg>
  )
}

const FEATURE_SPRITES = [
  { sprite: <Sword scale={2} />, label: 'Arena', desc: 'Duel other heroes live' },
  { sprite: <Bookshelf scale={2} />, label: 'Workshop', desc: 'Skill tree unlocks' },
  { sprite: <Chest scale={2} />, label: 'Events', desc: 'Seasonal quests & loot' },
  { sprite: <PixelCoin scale={2} />, label: 'Rewards', desc: 'Gold, gems, titles' },
]

export function LoginPage() {
  const { t } = useTranslation()
  const { refresh } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [loadingProvider, setLoadingProvider] = useState<'yandex' | 'telegram' | null>(null)
  const [error, setError] = useState('')

  const [telegramStep, setTelegramStep] = useState<'idle' | 'code'>('idle')
  const [telegramToken, setTelegramToken] = useState('')
  const [telegramCode, setTelegramCode] = useState('')
  const [submittingCode, setSubmittingCode] = useState(false)
  const codeInputRef = useRef<HTMLInputElement>(null)

  const handleYandex = async () => {
    setLoading(true)
    setLoadingProvider('yandex')
    setError('')
    try {
      const { authUrl } = await authApi.startYandexAuth()
      window.location.href = authUrl
    } catch {
      setError(t('login.error.authFailed'))
      setLoading(false)
      setLoadingProvider(null)
    }
  }

  const handleTelegram = async () => {
    setLoading(true)
    setLoadingProvider('telegram')
    setError('')
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
      setLoading(false)
      setLoadingProvider(null)
    }
  }

  const handleTelegramCodeSubmit = async () => {
    const code = telegramCode.trim()
    if (code.length < 4) return
    setSubmittingCode(true)
    setError('')
    try {
      await authApi.telegramLogin(telegramToken, code)
      await refresh()
      navigate('/hub')
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
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Cozy scene banner at top */}
      <RoomScene variant="cozy" height={200}>
        <div
          style={{
            position: 'absolute',
            left: 40,
            bottom: 20,
            display: 'flex',
            gap: 24,
            alignItems: 'flex-end',
          }}
        >
          <Torch scale={3} />
          <Hero scale={5} />
          <Torch scale={3} />
        </div>
        <Fireflies count={14} />
      </RoomScene>

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 16px 48px',
        }}
      >
        <Panel
          style={{
            maxWidth: 460,
            width: '100%',
            animation: 'rpg-pop-in 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}
        >
          {/* Brand */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              marginBottom: 14,
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                background: 'var(--ember-1)',
                border: '3px solid var(--ink-0)',
                boxShadow: 'inset -3px -3px 0 var(--ember-0), inset 3px 3px 0 var(--ember-3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'Pixelify Sans, Unbounded, monospace',
                fontSize: 26,
                color: 'var(--parch-0)',
              }}
            >
              D9
            </div>
            <div>
              <div
                className="font-display"
                style={{ fontSize: 28, lineHeight: 1, color: 'var(--ink-0)' }}
              >
                druz9
              </div>
              <div
                className="font-silkscreen uppercase"
                style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.1em' }}
              >
                season III · the ember pact
              </div>
            </div>
          </div>

          <h1
            className="font-display"
            style={{ textAlign: 'center', fontSize: 22, margin: '0 0 4px' }}
          >
            Step into the world
          </h1>
          <p
            style={{
              textAlign: 'center',
              fontSize: 13,
              color: 'var(--ink-2)',
              marginBottom: 18,
            }}
          >
            Practice algorithms, duel friends, climb the season pass.
          </p>

          {error && (
            <div
              style={{
                marginBottom: 14,
                padding: '10px 12px',
                border: '3px solid var(--rpg-danger, #a23a2a)',
                background: 'rgba(162, 58, 42, 0.12)',
                color: 'var(--rpg-danger, #a23a2a)',
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          {telegramStep === 'code' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <RpgButton size="sm" variant="ghost" onClick={handleTelegramBack}>
                ← Back
              </RpgButton>
              <div>
                <div
                  className="font-display"
                  style={{ fontSize: 14, marginBottom: 4 }}
                >
                  Enter the rune from Telegram
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>
                  The bot whispered you a code — type it here.
                </div>
              </div>
              <input
                ref={codeInputRef}
                type="text"
                inputMode="numeric"
                maxLength={8}
                placeholder="••••••"
                value={telegramCode}
                onChange={(e) => setTelegramCode(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTelegramCodeSubmit()
                }}
                disabled={submittingCode}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontFamily: 'Pixelify Sans, Unbounded, monospace',
                  fontSize: 18,
                  letterSpacing: '0.2em',
                  textAlign: 'center',
                  background: 'var(--parch-2)',
                  border: '3px solid var(--ink-0)',
                  boxShadow: 'inset 2px 2px 0 var(--parch-3), inset -2px -2px 0 var(--parch-0)',
                  color: 'var(--ink-0)',
                  outline: 'none',
                }}
              />
              <RpgButton
                variant="primary"
                disabled={submittingCode || telegramCode.trim().length < 4}
                onClick={handleTelegramCodeSubmit}
              >
                {submittingCode ? 'Casting...' : 'Enter the gate'}
              </RpgButton>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <RpgButton
                onClick={handleYandex}
                disabled={loading}
                style={{ padding: '14px 16px' }}
              >
                <YandexIcon />
                <span style={{ flex: 1, textAlign: 'center' }}>
                  {loadingProvider === 'yandex' ? 'Opening portal...' : 'Continue with Yandex'}
                </span>
              </RpgButton>
              <Divider label="or" />
              <RpgButton
                onClick={handleTelegram}
                disabled={loading}
                style={{ padding: '14px 16px' }}
              >
                <TelegramIcon />
                <span style={{ flex: 1, textAlign: 'center' }}>
                  {loadingProvider === 'telegram'
                    ? 'Summoning bot...'
                    : 'Continue with Telegram'}
                </span>
              </RpgButton>
            </div>
          )}

          <div className="rpg-divider" />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 8,
            }}
          >
            {FEATURE_SPRITES.map((f) => (
              <div
                key={f.label}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid var(--ink-0)',
                    background: 'var(--parch-2)',
                    boxShadow: 'inset 2px 2px 0 var(--parch-3), inset -2px -2px 0 var(--parch-0)',
                  }}
                >
                  {f.sprite}
                </div>
                <div
                  className="font-display"
                  style={{ fontSize: 11, color: 'var(--ink-0)', lineHeight: 1.1 }}
                >
                  {f.label}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: 'var(--ink-2)',
                    lineHeight: 1.2,
                  }}
                >
                  {f.desc}
                </div>
              </div>
            ))}
          </div>

          <div
            className="font-silkscreen uppercase"
            style={{
              textAlign: 'center',
              marginTop: 16,
              fontSize: 10,
              color: 'var(--ink-3)',
              letterSpacing: '0.1em',
            }}
          >
            By entering you accept the pact
          </div>
        </Panel>
      </div>
    </div>
  )
}

function Divider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '2px 0' }}>
      <div style={{ flex: 1, height: 0, borderTop: '2px dashed var(--ink-3)' }} />
      <span
        className="font-silkscreen uppercase"
        style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.1em' }}
      >
        {label}
      </span>
      <div style={{ flex: 1, height: 0, borderTop: '2px dashed var(--ink-3)' }} />
    </div>
  )
}
