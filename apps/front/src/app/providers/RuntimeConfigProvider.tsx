import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/shared/api/base';

type RuntimeConfig = {
  appRequireAuth: boolean;
  arenaRequireAuth: boolean;
};

type RuntimeConfigContextValue = RuntimeConfig & {
  isLoading: boolean;
  refresh: () => Promise<void>;
};

const DEFAULT_CONFIG: RuntimeConfig = {
  appRequireAuth: true,
  arenaRequireAuth: false,
};

const RuntimeConfigContext = createContext<RuntimeConfigContextValue | undefined>(undefined);

async function fetchRuntimeConfig(): Promise<RuntimeConfig> {
  const response = await apiClient.get<RuntimeConfig>('/api/public/runtime-config');
  return {
    appRequireAuth: response.data.appRequireAuth ?? DEFAULT_CONFIG.appRequireAuth,
    arenaRequireAuth: response.data.arenaRequireAuth ?? DEFAULT_CONFIG.arenaRequireAuth,
  };
}

export const RuntimeConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<RuntimeConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    try {
      const next = await fetchRuntimeConfig();
      setConfig(next);
    } catch (error) {
      console.error('Failed to load runtime config', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refresh();

    const interval = window.setInterval(() => {
      void refresh();
    }, 15000);

    const onFocus = () => {
      void refresh();
    };

    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const value = useMemo(
    () => ({
      ...config,
      isLoading,
      refresh,
    }),
    [config, isLoading],
  );

  return <RuntimeConfigContext.Provider value={value}>{children}</RuntimeConfigContext.Provider>;
};

export function useRuntimeConfig() {
  const context = useContext(RuntimeConfigContext);
  if (!context) {
    throw new Error('useRuntimeConfig must be used within RuntimeConfigProvider');
  }
  return context;
}
