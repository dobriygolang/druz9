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
    apiClient.get<{ app_require_auth?: boolean; arena_require_auth?: boolean }>('/api/v1/runtime-config')
      .then((r) => setConfig({
        appRequireAuth: r.data.app_require_auth ?? false,
        arenaRequireAuth: r.data.arena_require_auth ?? false,
      }))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <RuntimeConfigContext.Provider value={{ ...config, isLoading }}>
      {children}
    </RuntimeConfigContext.Provider>
  )
}
