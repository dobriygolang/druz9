import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { authApi } from '@/features/Auth/api/authApi'
import { useAuth } from '@/app/providers/AuthProvider'
import { geoApi, type GeoSuggestion } from '@/features/Geo/api/geoApi'
import { Panel, RpgButton } from '@/shared/ui/pixel'
import { Banner, Fireflies } from '@/shared/ui/sprites'

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
      navigate('/hub', { replace: true })
    } catch {
      setError(t('complete.error.saveFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        position: 'relative',
      }}
    >
      <Fireflies count={10} />
      <Panel
        style={{
          maxWidth: 460,
          width: '100%',
          animation: 'rpg-pop-in 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
          <Banner crest="D9" color="#b8692a" scale={3} />
        </div>
        <h1
          className="font-display"
          style={{ textAlign: 'center', fontSize: 22, margin: '0 0 4px' }}
        >
          {t('complete.title')}
        </h1>
        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-2)', marginBottom: 18 }}>
          {t('complete.subtitle')}
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div ref={wrapperRef} style={{ position: 'relative' }}>
            <label
              htmlFor="city-input"
              className="font-silkscreen uppercase"
              style={{
                display: 'block',
                fontSize: 10,
                color: 'var(--ink-2)',
                letterSpacing: '0.1em',
                marginBottom: 6,
              }}
            >
              {t('complete.city')}
            </label>
            <input
              id="city-input"
              type="text"
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => {
                if (suggestions.length > 0 && !selected) setShowDropdown(true)
              }}
              placeholder={t('complete.cityPlaceholder')}
              autoComplete="off"
              style={{
                width: '100%',
                padding: '12px 14px',
                fontFamily: 'IBM Plex Sans, system-ui',
                fontSize: 14,
                background: 'var(--parch-2)',
                border: '3px solid var(--ink-0)',
                boxShadow: 'inset 2px 2px 0 var(--parch-3), inset -2px -2px 0 var(--parch-0)',
                color: 'var(--ink-0)',
                outline: 'none',
              }}
            />
            {showDropdown && (
              <ul
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  right: 0,
                  maxHeight: 192,
                  overflowY: 'auto',
                  background: 'var(--parch-0)',
                  border: '3px solid var(--ink-0)',
                  boxShadow: '4px 4px 0 var(--ink-0)',
                  zIndex: 50,
                  listStyle: 'none',
                  margin: 0,
                  padding: 0,
                }}
              >
                {suggestions.map((s, i) => (
                  <li
                    key={i}
                    onClick={() => handleSelect(s)}
                    style={{
                      cursor: 'pointer',
                      padding: '10px 12px',
                      fontSize: 13,
                      color: 'var(--ink-0)',
                      borderBottom:
                        i === suggestions.length - 1 ? 'none' : '1px dashed var(--ink-3)',
                    }}
                    onMouseEnter={(e) => {
                      ;(e.target as HTMLLIElement).style.background = 'var(--parch-2)'
                    }}
                    onMouseLeave={(e) => {
                      ;(e.target as HTMLLIElement).style.background = 'transparent'
                    }}
                  >
                    {s.placeLabel}
                  </li>
                ))}
              </ul>
            )}
            {selected && (
              <p
                className="font-silkscreen uppercase"
                style={{
                  fontSize: 10,
                  color: 'var(--moss-1)',
                  letterSpacing: '0.08em',
                  marginTop: 6,
                }}
              >
                {[selected.city, selected.region, selected.country].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
          <RpgButton variant="primary" type="submit" disabled={loading}>
            {loading ? 'Sealing...' : t('complete.continue')}
          </RpgButton>
        </form>
      </Panel>
    </div>
  )
}
