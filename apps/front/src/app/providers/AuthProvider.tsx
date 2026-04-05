import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { authApi } from '@/features/Auth/api/authApi'
import type { User } from '@/entities/User/model/types'

interface AuthContextValue {
  isLoading: boolean
  isAuthenticated: boolean
  needsProfileComplete: boolean
  user: User | null
  refresh: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  isLoading: true,
  isAuthenticated: false,
  needsProfileComplete: false,
  user: null,
  refresh: async () => {},
  logout: async () => {},
})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [needsProfileComplete, setNeedsProfileComplete] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await authApi.getProfile()
      setUser(res.user)
      setIsAuthenticated(true)
      setNeedsProfileComplete(res.needsProfileComplete)
    } catch {
      setUser(null)
      setIsAuthenticated(false)
      setNeedsProfileComplete(false)
    }
  }, [])

  const logout = useCallback(async () => {
    await authApi.logout()
    setUser(null)
    setIsAuthenticated(false)
    setNeedsProfileComplete(false)
  }, [])

  useEffect(() => {
    refresh().finally(() => setIsLoading(false))
  }, [refresh])

  return (
    <AuthContext.Provider value={{ isLoading, isAuthenticated, needsProfileComplete, user, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
