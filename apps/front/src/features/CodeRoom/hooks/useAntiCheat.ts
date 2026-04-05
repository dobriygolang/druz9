import { useEffect, useCallback, useRef } from 'react'
import { apiClient } from '@/shared/api/base'

interface UseAntiCheatOptions {
  matchId: string | undefined
  enabled?: boolean
}

export function useAntiCheat({ matchId, enabled = true }: UseAntiCheatOptions) {
  const reportedRef = useRef(new Set<string>())

  const report = useCallback(async (reason: string) => {
    if (!matchId || !enabled || reportedRef.current.has(reason)) return
    reportedRef.current.add(reason)
    try {
      await apiClient.post('/api/v1/arena/anti-cheat/event', { match_id: matchId, reason })
    } catch {
      // silent
    }
  }, [matchId, enabled])

  useEffect(() => {
    if (!enabled || !matchId) return

    // Track tab switches
    const handleVisibility = () => {
      if (document.hidden) report('tab_switch')
    }
    document.addEventListener('visibilitychange', handleVisibility)

    // Track window blur (alt-tab, switching windows)
    const handleBlur = () => report('window_blur')
    window.addEventListener('blur', handleBlur)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('blur', handleBlur)
    }
  }, [enabled, matchId, report])

  // Block paste from external sources in editor
  const handleEditorPaste = useCallback((_e: ClipboardEvent) => {
    if (enabled && matchId) {
      report('external_paste')
    }
  }, [enabled, matchId, report])

  return { handleEditorPaste }
}
