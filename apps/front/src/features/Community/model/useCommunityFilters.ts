import { useState, useCallback } from 'react'

interface CommunityFilters {
  search: string
  category?: string
  city?: string
}

export function useCommunityFilters() {
  const [filters, setFilters] = useState<CommunityFilters>({ search: '' })

  const setSearch = useCallback((search: string) => {
    setFilters((f) => ({ ...f, search }))
  }, [])

  const setCategory = useCallback((category: string) => {
    setFilters((f) => ({ ...f, category: category || undefined }))
  }, [])

  const reset = useCallback(() => setFilters({ search: '' }), [])

  return { filters, setSearch, setCategory, reset }
}
