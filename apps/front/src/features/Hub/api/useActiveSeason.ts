import { useEffect, useState } from 'react'
import { hubApi } from './hubApi'

export interface ActiveSeason {
  number: number
  title: string
  roman: string
  daysLeftLabel: string
}

let cached: ActiveSeason | null | undefined
let inFlight: Promise<ActiveSeason | null> | null = null

async function fetchActiveSeason(): Promise<ActiveSeason | null> {
  if (cached !== undefined) return cached
  if (inFlight) return inFlight
  inFlight = hubApi
    .getOverview()
    .then((o) => {
      cached = o.activeSeason
      return cached
    })
    .catch(() => {
      cached = null
      return null
    })
    .finally(() => {
      inFlight = null
    })
  return inFlight
}

/**
 * Tiny shared-cache hook for "what season is live". Many places in the
 * UI (header, arena hub, season pass page, events) need it; this avoids
 * each of them re-fetching the same hub overview.
 */
export function useActiveSeason(): ActiveSeason | null {
  const [season, setSeason] = useState<ActiveSeason | null>(cached ?? null)
  useEffect(() => {
    let cancelled = false
    void fetchActiveSeason().then((s) => {
      if (!cancelled) setSeason(s)
    })
    return () => {
      cancelled = true
    }
  }, [])
  return season
}
