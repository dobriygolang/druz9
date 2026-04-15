import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { authApi } from '@/features/Auth/api/authApi'
import { useAuth } from '@/app/providers/AuthProvider'
import { geoApi, type GeoSuggestion } from '@/features/Geo/api/geoApi'
import { Button } from '@/shared/ui/Button'
import { cn } from '@/shared/lib/cn'

export function CompleteRegistrationPage() {
  const { t } = useTranslation()
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
      setError(t('complete.error.chooseCity'))
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
      setError(t('complete.error.saveFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F2F3F0] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-[460px]">
        <div className="overflow-hidden rounded-[28px] border border-[#d8d9d6] bg-white shadow-[0_16px_34px_rgba(15,23,42,0.06)]">
          <div className="h-1.5 bg-gradient-to-r from-[#6366F1] via-[#8b5cf6] to-[#a78bfa]" />
          <div className="p-6 sm:p-8">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#6366F1]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M4 20L12 4L20 20" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M7 14H17" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </div>
              <h2 className="text-xl font-bold text-[#111111]">{t('complete.title')}</h2>
              <p className="mt-1 text-sm text-[#666666]">{t('complete.subtitle')}</p>
            </div>
            {error && (
              <div className="mb-4 rounded-lg border border-[#fca5a5] bg-[#fef2f2] p-3 text-sm text-[#dc2626]">{error}</div>
            )}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div ref={wrapperRef} className="relative flex flex-col gap-1.5">
                <label htmlFor="city-input" className="text-xs font-500 text-[#475569]">
                  {t('complete.city')}
                </label>
                <input
                  id="city-input"
                  type="text"
                  value={query}
                  onChange={e => handleInputChange(e.target.value)}
                  onFocus={() => { if (suggestions.length > 0 && !selected) setShowDropdown(true) }}
                  placeholder={t('complete.cityPlaceholder')}
                  autoComplete="off"
                  className={cn(
                    'w-full px-3 py-3 text-sm rounded-xl transition-colors',
                    'bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] placeholder-[#94a3b8]',
                    'focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[#6366f1]',
                  )}
                />
                {showDropdown && (
                  <ul className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl border border-[#e2e8f0] bg-white shadow-lg z-50">
                    {suggestions.map((s, i) => (
                      <li
                        key={i}
                        onClick={() => handleSelect(s)}
                        className="cursor-pointer px-3 py-2 text-sm text-[#0f172a] hover:bg-[#f1f5f9] first:rounded-t-xl last:rounded-b-xl"
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
              <Button type="submit" variant="orange" loading={loading} className="mt-2 w-full justify-center rounded-2xl">
                {t('complete.continue')}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
