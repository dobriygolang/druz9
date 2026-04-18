import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '@/features/Auth/api/authApi'
import { useAuth } from '@/app/providers/AuthProvider'
import { SpiritOrb } from '@/shared/ui/sprites'

export function AuthCallbackPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { refresh } = useAuth()

  useEffect(() => {
    const state = params.get('state')
    const code = params.get('code')
    if (state && code) {
      authApi
        .yandexAuth(state, code)
        .then(async (res) => {
          await refresh()
          navigate(res.needsProfileComplete ? '/complete-registration' : '/hub', {
            replace: true,
          })
        })
        .catch(() => navigate('/login', { replace: true }))
    } else {
      navigate('/login', { replace: true })
    }
  }, [params, navigate, refresh])

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 18,
      }}
    >
      <SpiritOrb scale={6} />
      <div
        className="font-display uppercase"
        style={{ fontSize: 16, color: 'var(--ink-1)', letterSpacing: '0.08em' }}
      >
        Opening the gate...
      </div>
      <div
        className="font-silkscreen uppercase"
        style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.1em' }}
      >
        Signing you in
      </div>
    </div>
  )
}
