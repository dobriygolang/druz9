import {
  CompleteProfilePayload,
  ProfileResponse,
  User,
} from '@/entities/User/model/types';
import { apiClient } from '@/shared/api/base';

type BackendUser = {
  id: string;
  username?: string;
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
  is_trusted?: boolean;
  isTrusted?: boolean;
  created_at?: string;
  createdAt?: string;
  current_workplace?: string;
  currentWorkplace?: string;
  connected_providers?: string[];
  connectedProviders?: string[];
  primary_provider?: string;
  primaryProvider?: string;
};

type BackendProfileResponse = {
  user: BackendUser;
  needs_profile_complete?: boolean;
  needsProfileComplete?: boolean;
};

type BindTelegramResponse = {
  status: string;
};

type GetPhotoUploadURLResponse = {
  upload_url: string;
  uploadUrl?: string;
  object_key: string;
  objectKey?: string;
  expires_in_seconds: number;
  expiresInSeconds?: number;
};

type CompletePhotoUploadResponse = {
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

type YandexAuthStartResponse = {
  state: string;
  auth_url?: string;
  authUrl?: string;
  expires_at?: string;
  expiresAt?: string;
};

function normalizeActivityStatus(value: unknown): User['activityStatus'] {
  if (value === 1 || value === 'USER_ACTIVITY_STATUS_ONLINE' || value === 'online') return 'online';
  if (value === 2 || value === 'USER_ACTIVITY_STATUS_RECENTLY_ACTIVE' || value === 'recently_active') return 'recently_active';
  if (value === 3 || value === 'USER_ACTIVITY_STATUS_OFFLINE' || value === 'offline') return 'offline';
  return 'offline';
}

function normalizeUser(user: BackendUser): User {
  return {
    id: user.id,
    username: user.username ?? '',
    firstName: user.first_name ?? user.firstName ?? '',
    lastName: user.last_name ?? user.lastName ?? '',
    avatarUrl: user.avatar_url ?? user.avatarUrl ?? '',
    region: user.region ?? '',
    latitude: user.latitude ?? 0,
    longitude: user.longitude ?? 0,
    activityStatus: normalizeActivityStatus(user.activity_status ?? user.activityStatus),
    isAdmin: user.is_admin ?? user.isAdmin ?? false,
    isTrusted: user.is_trusted ?? user.isTrusted ?? false,
    currentWorkplace: user.current_workplace ?? user.currentWorkplace ?? '',
    connectedProviders: user.connected_providers ?? user.connectedProviders ?? [],
    primaryProvider: user.primary_provider ?? user.primaryProvider ?? '',
    createdAt: user.created_at ?? user.createdAt ?? '',
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

export function clearProfileByIdCache(userId?: string) {
  if (userId) {
    profileByIdCache.delete(userId);
  } else {
    profileByIdCache.clear();
  }
}

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
  telegramLogin: async (token: string, code: string): Promise<ProfileResponse> => {
    const response = await apiClient.post<BackendProfileResponse>(
      '/api/v1/profile/auth/telegram',
      { token, code },
    );
    return normalizeProfileResponse(response.data);
  },
  startYandexAuth: async (): Promise<{ state: string; authUrl: string; expiresAt: string }> => {
    const response = await apiClient.get<YandexAuthStartResponse>(
      '/api/v1/profile/auth/yandex/start',
    );
    return {
      state: response.data.state,
      authUrl: response.data.auth_url ?? response.data.authUrl ?? '',
      expiresAt: response.data.expires_at ?? response.data.expiresAt ?? '',
    };
  },
  yandexAuth: async (state: string, code: string): Promise<ProfileResponse> => {
    const response = await apiClient.get<BackendProfileResponse>(
      '/api/v1/profile/auth/yandex/callback',
      { params: { state, code } },
    );
    return normalizeProfileResponse(response.data);
  },
  bindTelegram: async (token: string, code: string): Promise<void> => {
    await apiClient.post<BindTelegramResponse>(
      '/api/v1/profile/bind-telegram',
      { token, code },
    );
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
    const response = await apiClient.post('/api/v1/profile/auth/logout', {});
    profileByIdCache.clear();
    profileByIdPromises.clear();
    // Clear auth token from localStorage on logout
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
    }
    return response.data;
  },
  getPhotoUploadURL: async (fileName: string, contentType: string) => {
    const response = await apiClient.post<GetPhotoUploadURLResponse>(
      '/api/v1/profile/photo/upload-url',
      { file_name: fileName, content_type: contentType },
    );
    return {
      uploadUrl: response.data.upload_url ?? response.data.uploadUrl ?? '',
      objectKey: response.data.object_key ?? response.data.objectKey ?? '',
      expiresInSeconds: response.data.expires_in_seconds ?? response.data.expiresInSeconds ?? 900,
    };
  },
  completePhotoUpload: async (objectKey: string): Promise<ProfileResponse> => {
    const response = await apiClient.post<CompletePhotoUploadResponse>(
      '/api/v1/profile/photo/complete',
      { object_key: objectKey },
    );
    return normalizeProfileResponse({
      user: response.data.user,
      needs_profile_complete: response.data.needs_profile_complete ?? response.data.needsProfileComplete ?? false,
    });
  },
};
