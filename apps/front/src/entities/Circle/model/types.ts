import { ArenaPlayerStats } from '@/entities/CodeRoom/model/types';
import { CommunityEvent, CommunityMapPoint } from '@/entities/User/model/types';

export type CircleVisibility = 'open' | 'closed';

export interface CircleMember extends CommunityMapPoint {
  arenaStats: ArenaPlayerStats;
}

export interface CircleLeaderboardEntry extends ArenaPlayerStats {
  avatarUrl: string;
  region: string;
}

export interface Circle {
  id: string;
  slug: string;
  name: string;
  description: string;
  visibility: CircleVisibility;
  focusLabel: string;
  hubLabel: string;
  accentColor: string;
  tags: string[];
  joined: boolean;
  memberCount: number;
  onlineCount: number;
  eventCount: number;
  upcomingEvents: CommunityEvent[];
  leaderboard: CircleLeaderboardEntry[];
  members: CircleMember[];
  recommendedMembers: CircleMember[];
}
