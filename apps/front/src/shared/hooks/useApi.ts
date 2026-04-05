import { useState, useEffect, useCallback, useRef } from 'react'

interface UseApiResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[] = []): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetcher()
      if (mountedRef.current) {
        setData(result)
        setError(null)
      }
    } catch (e: any) {
      if (mountedRef.current) {
        const msg = e?.response?.status === 404 ? 'Ресурс не найден'
          : e?.response?.status === 403 ? 'Нет доступа'
          : e?.response?.status >= 500 ? 'Ошибка сервера'
          : e?.message || 'Ошибка загрузки'
        setError(msg)
      }
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, deps)

  useEffect(() => {
    mountedRef.current = true
    fetch()
    return () => { mountedRef.current = false }
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}
