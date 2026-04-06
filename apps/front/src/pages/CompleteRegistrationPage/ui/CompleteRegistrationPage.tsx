import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '@/features/Auth/api/authApi'
import { useAuth } from '@/app/providers/AuthProvider'
import { geoApi, type GeoSuggestion } from '@/features/Geo/api/geoApi'
import { Button } from '@/shared/ui/Button'
import { cn } from '@/shared/lib/cn'

export function CompleteRegistrationPage() {
  const navigate = useNavigate()
  const { refresh } = useAuth()

  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<GeoSuggestion[]>([])
  const [selected, setSelected] = useState<GeoSuggestion | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Debounced search
  useEffect(() => {
    if (selected) return
    if (query.trim().length < 2) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await geoApi.suggest(query.trim())
        setSuggestions(results)
        setShowDropdown(results.length > 0)
      } catch {
        setSuggestions([])
      }
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [query, selected])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (s: GeoSuggestion) => {
    setSelected(s)
    setQuery(s.placeLabel)
    setShowDropdown(false)
    setSuggestions([])
  }

  const handleInputChange = (value: string) => {
    setQuery(value)
    if (selected) setSelected(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) {
      setError('Выберите город из списка')
      return
    }
    setLoading(true)
    setError('')
    try {
      await authApi.completeRegistration({
        country: selected.country ?? '',
        region: selected.region ?? '',
        city: selected.city ?? '',
        latitude: selected.latitude,
        longitude: selected.longitude,
      })
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
            <div className="w-12 h-12 bg-[#6366F1] rounded-2xl flex items-center justify-center mx-auto mb-3">
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
            <div ref={wrapperRef} className="relative flex flex-col gap-1.5">
              <label htmlFor="city-input" className="text-xs font-500 text-[#475569]">
                Город
              </label>
              <input
                id="city-input"
                type="text"
                value={query}
                onChange={e => handleInputChange(e.target.value)}
                onFocus={() => { if (suggestions.length > 0 && !selected) setShowDropdown(true) }}
                placeholder="Начните вводить город..."
                autoComplete="off"
                className={cn(
                  'w-full px-3 py-2 text-sm rounded-lg transition-colors',
                  'bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] placeholder-[#94a3b8]',
                  'focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[#6366f1]',
                )}
              />
              {showDropdown && (
                <ul className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e2e8f0] rounded-lg shadow-lg max-h-48 overflow-y-auto z-50">
                  {suggestions.map((s, i) => (
                    <li
                      key={i}
                      onClick={() => handleSelect(s)}
                      className="px-3 py-2 text-sm text-[#0f172a] hover:bg-[#f1f5f9] cursor-pointer first:rounded-t-lg last:rounded-b-lg"
                    >
                      {s.placeLabel}
                    </li>
                  ))}
                </ul>
              )}
              {selected && (
                <p className="text-xs text-[#6366f1]">
                  {[selected.city, selected.region, selected.country].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
            <Button type="submit" variant="orange" loading={loading} className="w-full justify-center mt-2">
              Продолжить
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
