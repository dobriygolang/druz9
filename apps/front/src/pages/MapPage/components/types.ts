import { CommunityEvent, CommunityMapPoint } from '@/entities/User/model/types';

export type DisplayUserPoint = CommunityMapPoint & {
  displayLatitude: number;
  displayLongitude: number;
};

export type DisplayEvent = CommunityEvent & {
  displayLatitude: number;
  displayLongitude: number;
};

export type UserCluster = {
  id: string;
  latitude: number;
  longitude: number;
  count: number;
  points: CommunityMapPoint[];
  sample: CommunityMapPoint;
};

export type EventDraft = {
  latitude?: number;
  longitude?: number;
  title: string;
  description: string;
  meeting_link: string;
  place_label: string;
  region: string;
  country: string;
  city: string;
  scheduled_at: string;
  invited_user_ids: string[];
};
