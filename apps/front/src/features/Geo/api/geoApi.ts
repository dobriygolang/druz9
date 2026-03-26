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
  return {
    userId: point.user_id ?? point.userId ?? '',
    title: point.title ?? '',
    region: point.region ?? '',
    latitude: point.latitude ?? 0,
    longitude: point.longitude ?? 0,
    isCurrentUser: point.is_current_user ?? point.isCurrentUser ?? false,
    avatarUrl: point.avatar_url ?? point.avatarUrl ?? '',
    telegramUsername:
      point.telegram_username ?? point.telegramUsername ?? '',
    firstName: point.first_name ?? point.firstName ?? '',
    lastName: point.last_name ?? point.lastName ?? '',
    activityStatus: point.activity_status ?? point.activityStatus ?? 'offline',
  };
}

export const geoApi = {
  resolve: async (query: string): Promise<LocationCandidate[]> => {
    const response = await apiClient.post<BackendResolveResponse>(
      '/api/v1/geo/resolve',
      { query },
    );
    return (response.data.candidates ?? []).map(normalizeCandidate);
  },
  communityMap: async (): Promise<CommunityMapPoint[]> => {
    const response = await apiClient.get<BackendCommunityMapResponse>(
      '/api/v1/geo/community',
    );
    return (response.data.points ?? []).map(normalizeCommunityMapPoint);
  },
};
