import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '@/features/Auth/api/authApi'
import { useAuth } from '@/app/providers/AuthProvider'
import { Spinner } from '@/shared/ui/Spinner'

export function AuthCallbackPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { refresh } = useAuth()

  useEffect(() => {
    const state = params.get('state')
    const code = params.get('code')
    if (state && code) {
      authApi.yandexAuth(state, code)
        .then(async (res) => {
          await refresh()
          navigate(res.needsProfileComplete ? '/complete-registration' : '/home', { replace: true })
        })
        .catch(() => navigate('/login', { replace: true }))
    } else {
      navigate('/login', { replace: true })
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#F2F3F0] flex items-center justify-center">
      <div className="text-center">
        <Spinner size="lg" className="mx-auto mb-4" />
        <p className="text-[#64748b] text-sm">Авторизация...</p>
      </div>
    </div>
  )
}
