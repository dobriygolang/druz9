import { useState, useEffect, useCallback } from 'react'

const GUEST_NAME_KEY = 'guestCodeRoomName'

interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
}

export function useInviteHandler(
  auth: AuthState,
  inviteCode: string | null,
  _fallbackPath: string,
) {
  const [redirectTo, setRedirectTo] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [needsGuestName, setNeedsGuestName] = useState(false)

  const getGuestName = useCallback(() => localStorage.getItem(GUEST_NAME_KEY) ?? '', [])
  const setGuestName = useCallback((name: string) => {
    localStorage.setItem(GUEST_NAME_KEY, name)
    setNeedsGuestName(false)
    if (inviteCode) setRedirectTo(`/code-rooms/invite/${inviteCode}`)
  }, [inviteCode])
  const cancelGuestName = useCallback(() => setNeedsGuestName(false), [])

  useEffect(() => {
    if (!inviteCode || auth.isLoading) return
    setIsProcessing(true)
    if (!auth.isAuthenticated) {
      const existingName = localStorage.getItem(GUEST_NAME_KEY)
      if (existingName) {
        setRedirectTo(`/code-rooms/invite/${inviteCode}`)
      } else {
        setNeedsGuestName(true)
      }
    } else {
      setRedirectTo(`/code-rooms/invite/${inviteCode}`)
    }
    setIsProcessing(false)
  }, [inviteCode, auth.isAuthenticated, auth.isLoading])

  return { redirectTo, isProcessing, needsGuestName, getGuestName, setGuestName, cancelGuestName }
}
