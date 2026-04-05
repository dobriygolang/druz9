import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '@/features/Auth/api/authApi'
import { useAuth } from '@/app/providers/AuthProvider'
import { Input } from '@/shared/ui/Input'
import { Button } from '@/shared/ui/Button'

export function CompleteRegistrationPage() {
  const navigate = useNavigate()
  const { refresh } = useAuth()
  const [form, setForm] = useState({ region: '', country: '', city: '', latitude: 0, longitude: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await authApi.completeRegistration(form)
      await refresh()
      navigate('/home', { replace: true })
    } catch {
      setError('Ошибка при сохранении профиля')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F2F3F0] flex items-center justify-center">
      <div className="w-full max-w-[420px] mx-4">
        <div className="bg-white rounded-2xl border border-[#CBCCC9] p-8">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-[#FF8400] rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M4 20L12 4L20 20" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 14H17" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[#111111]">Завершите регистрацию</h2>
            <p className="text-sm text-[#666666] mt-1">Укажите ваше местоположение</p>
          </div>
          {error && (
            <div className="mb-4 p-3 bg-[#fef2f2] border border-[#fca5a5] rounded-lg text-sm text-[#dc2626]">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input label="Страна" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder="Россия" />
            <Input label="Регион" value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))} placeholder="Москва" />
            <Input label="Город" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Москва" />
            <Button type="submit" variant="orange" loading={loading} className="w-full justify-center mt-2">
              Продолжить
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
