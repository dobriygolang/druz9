import {
  CommunityMapPoint,
  LocationCandidate,
} from '@/entities/User/model/types';
import { apiClient } from '@/shared/api/base';

type BackendCandidate = {
  region?: string;
  country?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  display_name?: string;
  displayName?: string;
};

type BackendResolveResponse = {
  candidates?: BackendCandidate[];
};

type BackendCommunityMapPoint = {
  user_id?: string;
  userId?: string;
  title?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
  is_current_user?: boolean;
  isCurrentUser?: boolean;
  avatar_url?: string;
  avatarUrl?: string;
  telegram_avatar_url?: string;
  telegramAvatarUrl?: string;
  telegram_username?: string;
  telegramUsername?: string;
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  activity_status?: CommunityMapPoint['activityStatus'];
  activityStatus?: CommunityMapPoint['activityStatus'];
};

type BackendCommunityMapResponse = {
  points?: BackendCommunityMapPoint[];
};

function normalizeActivityStatus(value: unknown): CommunityMapPoint['activityStatus'] {
  if (value === 1 || value === 'USER_ACTIVITY_STATUS_ONLINE' || value === 'online') return 'online';
  if (value === 2 || value === 'USER_ACTIVITY_STATUS_RECENTLY_ACTIVE' || value === 'recently_active') return 'recently_active';
  if (value === 3 || value === 'USER_ACTIVITY_STATUS_OFFLINE' || value === 'offline') return 'offline';
  return 'offline';
}

function normalizeCandidate(candidate: BackendCandidate): LocationCandidate {
  return {
    region: candidate.region ?? '',
    country: candidate.country ?? '',
    city: candidate.city ?? '',
    latitude: candidate.latitude ?? 0,
    longitude: candidate.longitude ?? 0,
    displayName: candidate.display_name ?? candidate.displayName ?? '',
  };
}

function normalizeCommunityMapPoint(
  point: BackendCommunityMapPoint,
): CommunityMapPoint {
  // S3 avatar has priority, fallback to Telegram avatar
  const s3Avatar = point.avatar_url ?? point.avatarUrl ?? '';
  const telegramAvatar = point.telegram_avatar_url ?? point.telegramAvatarUrl ?? '';

  return {
    userId: point.user_id ?? point.userId ?? '',
    title: point.title ?? '',
    region: point.region ?? '',
    latitude: point.latitude ?? 0,
    longitude: point.longitude ?? 0,
    isCurrentUser: point.is_current_user ?? point.isCurrentUser ?? false,
    avatarUrl: s3Avatar || telegramAvatar,
    telegramAvatarUrl: telegramAvatar,
    telegramUsername:
      point.telegram_username ?? point.telegramUsername ?? '',
    firstName: point.first_name ?? point.firstName ?? '',
    lastName: point.last_name ?? point.lastName ?? '',
    activityStatus: normalizeActivityStatus(point.activity_status ?? point.activityStatus),
  };
}

// Cache for communityMap - shared across all pages
const communityMapCache = {
  data: null as CommunityMapPoint[] | null,
  timestamp: 0,
  ttl: 30000, // 30 seconds
};

export const geoApi = {
  resolve: async (query: string): Promise<LocationCandidate[]> => {
    const response = await apiClient.post<BackendResolveResponse>(
      '/api/v1/geo/resolve',
      { query },
    );
    return (response.data.candidates ?? []).map(normalizeCandidate);
  },
  communityMap: async (): Promise<CommunityMapPoint[]> => {
    const now = Date.now();
    if (communityMapCache.data && now - communityMapCache.timestamp < communityMapCache.ttl) {
      return communityMapCache.data;
    }
    const response = await apiClient.get<BackendCommunityMapResponse>(
      '/api/v1/geo/community',
    );
    const points = (response.data.points ?? []).map(normalizeCommunityMapPoint);
    communityMapCache.data = points;
    communityMapCache.timestamp = now;
    return points;
  },
};
