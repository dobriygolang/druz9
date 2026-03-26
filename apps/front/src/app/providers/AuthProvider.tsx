import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  CompleteProfilePayload,
  ProfileResponse,
} from '@/entities/User/model/types';
import { authApi } from '@/features/Auth/api/authApi';

interface AuthContextType {
  user: ProfileResponse['user'] | null;
  needsProfileComplete: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: unknown) => Promise<void>;
  completeProfile: (payload: CompleteProfilePayload) => Promise<void>;
  updateLocation: (payload: CompleteProfilePayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: (force?: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

let cachedProfile: ProfileResponse | null = null;
let bootstrapPromise: Promise<ProfileResponse | null> | null = null;

async function loadProfile(force = false): Promise<ProfileResponse | null> {
  if (!force && cachedProfile) {
    return cachedProfile;
  }

  if (!force && bootstrapPromise) {
    return bootstrapPromise;
  }

  bootstrapPromise = authApi
    .getProfile()
    .then((data) => {
      cachedProfile = data;
      return data;
    })
    .catch(() => {
      cachedProfile = null;
      return null;
    })
    .finally(() => {
      bootstrapPromise = null;
    });

  return bootstrapPromise;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<ProfileResponse['user'] | null>(
    cachedProfile?.user ?? null,
  );
  const [needsProfileComplete, setNeedsProfileComplete] = useState(
    cachedProfile?.needsProfileComplete ?? false,
  );
  const [isLoading, setIsLoading] = useState(!cachedProfile);

  const refreshProfile = async (force = false) => {
    try {
      setIsLoading(true);
      const data = await loadProfile(force);
      setUser(data?.user ?? null);
      setNeedsProfileComplete(data?.needsProfileComplete ?? false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshProfile();
  }, []);

  const login = async (payload: unknown) => {
    const data = await authApi.telegramLogin(payload);
    cachedProfile = data;
    setUser(data.user);
    setNeedsProfileComplete(data.needsProfileComplete);
  };

  const completeProfile = async (payload: CompleteProfilePayload) => {
    let data = await authApi.completeRegistration(payload);
    const currentWorkplace = payload.currentWorkplace?.trim();

    if (currentWorkplace !== undefined) {
      data = await authApi.updateProfile({
        currentWorkplace,
      });
    }

    cachedProfile = data;
    setUser(data.user);
    setNeedsProfileComplete(data.needsProfileComplete);
  };

  const updateLocation = async (payload: CompleteProfilePayload) => {
    const data = await authApi.updateLocation(payload);
    cachedProfile = data;
    setUser(data.user);
    setNeedsProfileComplete(data.needsProfileComplete);
  };

  const logout = async () => {
    await authApi.logout();
    cachedProfile = null;
    setUser(null);
    setNeedsProfileComplete(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        needsProfileComplete,
        isLoading,
        isAuthenticated: !!user,
        login,
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
