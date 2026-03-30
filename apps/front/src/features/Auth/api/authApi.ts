import {
  CompleteProfilePayload,
  ProfileResponse,
  User,
} from '@/entities/User/model/types';
import { apiClient } from '@/shared/api/base';

type BackendUser = {
  id: string;
  telegram_id?: string;
  telegramId?: string;
  telegram_username?: string;
  telegramUsername?: string;
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  avatar_url?: string;
  avatarUrl?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
  activity_status?: User['activityStatus'];
  activityStatus?: User['activityStatus'];
  is_admin?: boolean;
  isAdmin?: boolean;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
  current_workplace?: string;
  currentWorkplace?: string;
};

type BackendProfileResponse = {
  user: BackendUser;
  needs_profile_complete?: boolean;
  needsProfileComplete?: boolean;
};

type TelegramAuthChallengeResponse = {
  token: string;
  bot_start_url?: string;
  botStartUrl?: string;
  expires_at?: string;
  expiresAt?: string;
};

function normalizeActivityStatus(value: unknown): User['activityStatus'] {
  if (value === 1 || value === 'USER_ACTIVITY_STATUS_ONLINE' || value === 'online') return 'online';
  if (value === 2 || value === 'USER_ACTIVITY_STATUS_RECENTLY_ACTIVE' || value === 'recently_active') return 'recently_active';
  return 'offline';
}

function normalizeUser(user: BackendUser): User {
  return {
    id: user.id,
    telegramId: String(user.telegram_id ?? user.telegramId ?? ''),
    telegramUsername: user.telegram_username ?? user.telegramUsername ?? '',
    firstName: user.first_name ?? user.firstName ?? '',
    lastName: user.last_name ?? user.lastName ?? '',
    avatarUrl: user.avatar_url ?? user.avatarUrl ?? '',
    region: user.region ?? '',
    latitude: user.latitude ?? 0,
    longitude: user.longitude ?? 0,
    activityStatus: normalizeActivityStatus(user.activity_status ?? user.activityStatus),
    isAdmin: user.is_admin ?? user.isAdmin ?? false,
    currentWorkplace: user.current_workplace ?? user.currentWorkplace ?? '',
    createdAt: user.created_at ?? user.createdAt ?? '',
    updatedAt: user.updated_at ?? user.updatedAt ?? '',
  };
}

function normalizeProfileResponse(data: BackendProfileResponse): ProfileResponse {
  return {
    user: normalizeUser(data.user),
    needsProfileComplete:
      data.needs_profile_complete ?? data.needsProfileComplete ?? false,
  };
}

const profileByIdCache = new Map<string, ProfileResponse>();
const profileByIdPromises = new Map<string, Promise<ProfileResponse>>();

export const authApi = {
  createTelegramAuthChallenge: async (): Promise<{
    token: string;
    botStartUrl: string;
    expiresAt: string;
  }> => {
    const response = await apiClient.post<TelegramAuthChallengeResponse>(
      '/api/v1/profile/auth/telegram/challenge',
      {},
    );

    return {
      token: response.data.token,
      botStartUrl: response.data.bot_start_url ?? response.data.botStartUrl ?? '',
      expiresAt: response.data.expires_at ?? response.data.expiresAt ?? '',
    };
  },
  telegramLogin: async (token: string): Promise<ProfileResponse> => {
    const response = await apiClient.post<BackendProfileResponse>(
      '/api/v1/profile/auth/telegram',
      { token },
    );
    return normalizeProfileResponse(response.data);
  },
  completeRegistration: async (
    payload: CompleteProfilePayload,
  ): Promise<ProfileResponse> => {
    const response = await apiClient.post<BackendProfileResponse>(
      '/api/v1/profile/auth/complete-registration',
      {
        region: payload.region,
        country: payload.country,
        city: payload.city,
        latitude: payload.latitude,
        longitude: payload.longitude,
      },
    );
    return normalizeProfileResponse(response.data);
  },
  getProfile: async (): Promise<ProfileResponse> => {
    const response = await apiClient.get<BackendProfileResponse>(
      '/api/v1/profile',
    );
    return normalizeProfileResponse(response.data);
  },
  getProfileById: async (userId: string): Promise<ProfileResponse> => {
    const cachedProfile = profileByIdCache.get(userId);
    if (cachedProfile) {
      return cachedProfile;
    }

    const inFlight = profileByIdPromises.get(userId);
    if (inFlight) {
      return inFlight;
    }

    const request = apiClient
      .get<BackendProfileResponse>(`/api/v1/profile/${userId}`)
      .then((response) => {
        const normalized = normalizeProfileResponse(response.data);
        profileByIdCache.set(userId, normalized);
        return normalized;
      })
      .finally(() => {
        profileByIdPromises.delete(userId);
      });

    profileByIdPromises.set(userId, request);
    return request;
  },
  updateLocation: async (
    payload: CompleteProfilePayload,
  ): Promise<ProfileResponse> => {
    const response = await apiClient.post<BackendProfileResponse>(
      '/api/v1/profile/location',
      {
        region: payload.region,
        country: payload.country,
        city: payload.city,
        latitude: payload.latitude,
        longitude: payload.longitude,
      },
    );
    const normalized = normalizeProfileResponse(response.data);
    profileByIdCache.set(normalized.user.id, normalized);
    return normalized;
  },
  updateProfile: async (payload: {
    currentWorkplace?: string;
  }): Promise<ProfileResponse> => {
    const response = await apiClient.post<BackendProfileResponse>(
      '/api/v1/profile/update',
      {
        currentWorkplace: payload.currentWorkplace,
      },
    );
    return normalizeProfileResponse(response.data);
  },
  logout: async () => {
    const response = await apiClient.post('/api/v1/profile/auth/logout');
    profileByIdCache.clear();
    profileByIdPromises.clear();
    // Clear auth token from localStorage on logout
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
    }
    return response.data;
  },
};
