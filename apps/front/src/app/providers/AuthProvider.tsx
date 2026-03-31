import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import {
  CompleteProfilePayload,
  ProfileResponse,
} from '@/entities/User/model/types';
import { authApi } from '@/features/Auth/api/authApi';
import {
  clearForcedGuestMode,
  clearGuestCodeRoomSession,
  hasGuestCodeRoomSession,
  isGuestModeForced,
  syncForcedGuestModeFromUrl,
} from '@/features/CodeRoom/lib/guestIdentity';

interface AuthContextType {
  user: ProfileResponse['user'] | null;
  needsProfileComplete: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, code: string) => Promise<void>;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  registerWithPassword: (payload: { email: string; password: string; firstName: string; lastName?: string }) => Promise<void>;
  completeProfile: (payload: CompleteProfilePayload) => Promise<void>;
  updateLocation: (payload: CompleteProfilePayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: (force?: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const KNOWN_AUTH_SESSION_KEY = 'known_auth_session';

function hasKnownAuthSession() {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.localStorage.getItem(KNOWN_AUTH_SESSION_KEY) === 'true';
}

function markKnownAuthSession() {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(KNOWN_AUTH_SESSION_KEY, 'true');
}

function clearKnownAuthSession() {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(KNOWN_AUTH_SESSION_KEY);
}

function shouldSkipProfileBootstrap() {
  if (typeof window === 'undefined') {
    return false;
  }

  const { pathname, search } = window.location;
  const searchParams = new URLSearchParams(search);
  const isCodeRoomsRoute = /^\/code-rooms(?:\/[^/]+)?\/?$/.test(pathname);
  const isArenaRoute = /^\/arena\/[^/]+\/?$/.test(pathname);
  const isGuestRealtimeRoute = (isCodeRoomsRoute || isArenaRoute) && hasGuestCodeRoomSession();
  const isForcedGuestRoute = (isCodeRoomsRoute || isArenaRoute) && isGuestModeForced();

  if (isForcedGuestRoute) {
    return true;
  }

  if (isCodeRoomsRoute && searchParams.has('invite') && !hasKnownAuthSession()) {
    return true;
  }

  if (isGuestRealtimeRoute && !hasKnownAuthSession()) {
    return true;
  }

  return false;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const guestModeForced = syncForcedGuestModeFromUrl();
  const cachedProfileRef = useRef<ProfileResponse | null>(null);
  const bootstrapPromiseRef = useRef<Promise<ProfileResponse | null> | null>(null);

  const loadProfile = useCallback(async (force = false): Promise<ProfileResponse | null> => {
    if (!force && isGuestModeForced()) {
      return null;
    }

    if (!force && shouldSkipProfileBootstrap()) {
      return null;
    }

    if (!force && cachedProfileRef.current) {
      return cachedProfileRef.current;
    }

    if (!force && bootstrapPromiseRef.current) {
      return bootstrapPromiseRef.current;
    }

    bootstrapPromiseRef.current = authApi
      .getProfile()
      .then((data) => {
        cachedProfileRef.current = data;
        if (data?.user) {
          markKnownAuthSession();
        }
        if (data?.user && hasGuestCodeRoomSession()) {
          clearGuestCodeRoomSession();
        }
        return data;
      })
      .catch(() => {
        cachedProfileRef.current = null;
        clearKnownAuthSession();
        return null;
      })
      .finally(() => {
        bootstrapPromiseRef.current = null;
      });

    return bootstrapPromiseRef.current;
  }, []);

  const [user, setUser] = useState<ProfileResponse['user'] | null>(
    null,
  );
  const [needsProfileComplete, setNeedsProfileComplete] = useState(
    false,
  );
  const [isLoading, setIsLoading] = useState(!guestModeForced);

  const refreshProfile = useCallback(async (force = false) => {
    if (!force && isGuestModeForced()) {
      setUser(null);
      setNeedsProfileComplete(false);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await loadProfile(force);
      setUser(data?.user ?? null);
      setNeedsProfileComplete(data?.needsProfileComplete ?? false);
    } finally {
      setIsLoading(false);
    }
  }, [loadProfile]);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const login = useCallback(async (token: string, code: string) => {
    const data = await authApi.telegramLogin(token, code);
    cachedProfileRef.current = data;
    clearForcedGuestMode();
    markKnownAuthSession();
    clearGuestCodeRoomSession();
    setUser(data.user);
    setNeedsProfileComplete(data.needsProfileComplete);
  }, []);

  const loginWithPassword = useCallback(async (login: string, password: string) => {
    const data = await authApi.loginWithPassword({ login, password });
    cachedProfileRef.current = data;
    clearForcedGuestMode();
    markKnownAuthSession();
    clearGuestCodeRoomSession();
    setUser(data.user);
    setNeedsProfileComplete(data.needsProfileComplete);
  }, []);

  const registerWithPassword = useCallback(async (payload: { login: string; password: string; firstName: string; lastName?: string }) => {
    const data = await authApi.registerWithPassword(payload);
    cachedProfileRef.current = data;
    clearForcedGuestMode();
    markKnownAuthSession();
    clearGuestCodeRoomSession();
    setUser(data.user);
    setNeedsProfileComplete(data.needsProfileComplete);
  }, []);

  const completeProfile = useCallback(async (payload: CompleteProfilePayload) => {
    let data = await authApi.completeRegistration(payload);
    const currentWorkplace = payload.currentWorkplace?.trim();

    if (currentWorkplace !== undefined) {
      data = await authApi.updateProfile({
        currentWorkplace,
      });
    }

    cachedProfileRef.current = data;
    clearForcedGuestMode();
    markKnownAuthSession();
    setUser(data.user);
    setNeedsProfileComplete(data.needsProfileComplete);
  }, []);

  const updateLocation = useCallback(async (payload: CompleteProfilePayload) => {
    const data = await authApi.updateLocation(payload);
    cachedProfileRef.current = data;
    clearForcedGuestMode();
    markKnownAuthSession();
    setUser(data.user);
    setNeedsProfileComplete(data.needsProfileComplete);
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    cachedProfileRef.current = null;
    clearForcedGuestMode();
    clearKnownAuthSession();
    clearGuestCodeRoomSession();
    setUser(null);
    setNeedsProfileComplete(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        needsProfileComplete,
        isLoading,
        isAuthenticated: !!user,
        login,
        loginWithPassword,
        registerWithPassword,
        completeProfile,
        updateLocation,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
