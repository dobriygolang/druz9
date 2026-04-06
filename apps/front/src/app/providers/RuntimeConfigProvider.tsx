import React, { createContext, useContext, useEffect, useState } from 'react'
import { apiClient } from '@/shared/api/base'

interface RuntimeConfig {
  appRequireAuth: boolean
  arenaRequireAuth: boolean
}

interface RuntimeConfigContextValue extends RuntimeConfig {
  isLoading: boolean
}

const RuntimeConfigContext = createContext<RuntimeConfigContextValue>({
  appRequireAuth: false,
  arenaRequireAuth: false,
  isLoading: false,
})

export const useRuntimeConfig = () => useContext(RuntimeConfigContext)

export const RuntimeConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<RuntimeConfig>({ appRequireAuth: false, arenaRequireAuth: false })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    apiClient.get<{ appRequireAuth?: boolean; arenaRequireAuth?: boolean }>('/api/public/runtime-config')
      .then((r) => setConfig({
        appRequireAuth: r.data.appRequireAuth ?? false,
        arenaRequireAuth: r.data.arenaRequireAuth ?? false,
      }))
      .catch((err) => { console.error('Failed to load runtime config:', err) })
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <RuntimeConfigContext.Provider value={{ ...config, isLoading }}>
      {children}
    </RuntimeConfigContext.Provider>
  )
}
