export type UserStatus = 'pending_profile' | 'active';
export type ActivityStatus = 'online' | 'recently_active' | 'offline' | 'unspecified';

export interface User {
  id: string;
  username: string;
  telegramUsername?: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
  region: string;
  latitude: number;
  longitude: number;
  activityStatus: ActivityStatus;
  isAdmin: boolean;
  isTrusted: boolean;
  currentWorkplace: string;
  connectedProviders: string[];
  primaryProvider: string;
  createdAt: string;
}

export interface ProfileResponse {
  user: User;
  needsProfileComplete: boolean;
}

export interface ProfileProgressOverview {
  practiceSessions: number;
  practicePassedSessions: number;
  practiceActiveDays: number;
  completedMockSessions: number;
  completedMockStages: number;
  answeredQuestions: number;
  averageStageScore: number;
  averageQuestionScore: number;
  currentStreakDays: number;
  lastActivityAt?: string;
}

export interface ProfileCompetency {
  key: string;
  label: string;
  score: number;
  practiceScore: number;
  verifiedScore: number;
  stageCount: number;
  questionCount: number;
  practiceSessions: number;
  practicePassedSessions: number;
  practiceDays: number;
  confidence: 'low' | 'medium' | 'verified';
  averageScore: number;
}

export interface ProfileProgressRecommendation {
  key: string;
  title: string;
  description: string;
  href: string;
}

export interface ProfileCheckpointProgress {
  id: string;
  taskId: string;
  taskTitle: string;
  skillKey: string;
  skillLabel: string;
  score: number;
  finishedAt?: string;
}

export interface ProfileProgress {
  overview: ProfileProgressOverview;
  competencies: ProfileCompetency[];
  strongest: ProfileCompetency[];
  weakest: ProfileCompetency[];
  recommendations: ProfileProgressRecommendation[];
  checkpoints: ProfileCheckpointProgress[];
  companies: string[];
}

export interface LocationCandidate {
  region: string;
  country: string;
  city: string;
  latitude: number;
  longitude: number;
  displayName: string;
}

export interface CompleteProfilePayload {
  region: string;
  country: string;
  city: string;
  latitude: number;
  longitude: number;
  currentWorkplace?: string;
}

export interface CommunityMapPoint {
  userId: string;
  title: string;
  region: string;
  latitude: number;
  longitude: number;
  isCurrentUser: boolean;
  avatarUrl: string;
  username: string;
  telegramUsername?: string;
  firstName: string;
  lastName: string;
  activityStatus: ActivityStatus;
}

export interface EventParticipant {
  user_id: string;
  title: string;
  avatar_url: string;
  status: 'invited' | 'joined' | 'declined' | 'unspecified';
}

export interface CommunityEvent {
  id: string;
  title: string;
  description: string;
  raw_description?: string;
  meeting_link: string;
  place_label: string;
  region: string;
  country: string;
  city: string;
  latitude: number;
  longitude: number;
  scheduled_at: string;
  created_at: string;
  creator_id: string;
  creator_name: string;
  is_creator: boolean;
  is_joined: boolean;
  participant_count: number;
  event_color: 'violet' | 'emerald' | 'amber' | 'rose' | 'sky';
  event_group: string;
  event_type: string;
  participants: EventParticipant[];
}

export interface CreateEventPayload {
  title: string;
  description: string;
  event_color?: 'violet' | 'emerald' | 'amber' | 'rose' | 'sky';
  event_group?: string;
  event_type?: string;
  repeat?: 'none' | 'daily' | 'weekly' | 'monthly';
  meeting_link: string;
  place_label: string;
  region: string;
  country: string;
  city: string;
  latitude: number;
  longitude: number;
  scheduled_at: string;
  invited_user_ids: string[];
}

export interface Podcast {
  id: string;
  title: string;
  author_id: string;
  author_name: string;
  duration_seconds: number;
  listens_count: string;
  file_name: string;
  content_type: string;
  is_uploaded: boolean;
  created_at: string;
}

export interface Vacancy {
  id: string;
  user_id: string;
  author_name: string;
  title: string;
  company: string;
  vacancy_url: string;
  description: string;
  experience: string;
  location: string;
  employment_type: string;
  is_owner: boolean;
  created_at: string;
}

export interface CreateVacancyPayload {
  title: string;
  company: string;
  vacancy_url: string;
  description: string;
  experience: string;
  location: string;
  employment_type: string;
}
