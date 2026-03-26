import { apiClient, ListQueryParams, withDefaultListQuery } from '@/shared/api/base';
import { CreateVacancyPayload, Vacancy } from '@/entities/User/model/types';

type BackendReferral = {
  id: string;
  userId?: string;
  authorName?: string;
  authorTelegramUsername?: string;
  authorTelegramProfileUrl?: string;
  title: string;
  company: string;
  vacancyUrl: string;
  description: string;
  experience: string;
  location: string;
  employmentType: string;
  isOwner?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type ListReferralsResponse = {
  referrals: BackendReferral[];
};

type ReferralResponse = {
  referral: BackendReferral;
};

function normalizeVacancy(r: BackendReferral): Vacancy {
  return {
    id: r.id,
    user_id: r.userId ?? '',
    author_name: r.authorName ?? 'Anonymous',
    author_telegram_username: r.authorTelegramUsername ?? '',
    author_telegram_profile_url: r.authorTelegramProfileUrl ?? '',
    title: r.title,
    company: r.company,
    vacancy_url: r.vacancyUrl,
    description: r.description,
    experience: r.experience,
    location: r.location,
    employment_type: r.employmentType,
    is_owner: r.isOwner ?? false,
    created_at: r.createdAt ?? '',
    updated_at: r.updatedAt ?? '',
  };
}

export const vacancyApi = {
  list: async (params?: ListQueryParams): Promise<Vacancy[]> => {
    const response = await apiClient.get<ListReferralsResponse>('/api/v1/referrals', {
      params: withDefaultListQuery(params),
    });
    return (response.data.referrals ?? []).map(normalizeVacancy);
  },

  create: async (payload: CreateVacancyPayload): Promise<Vacancy> => {
    const response = await apiClient.post<ReferralResponse>('/api/v1/referrals', {
      title: payload.title,
      company: payload.company,
      vacancyUrl: payload.vacancy_url,
      description: payload.description,
      experience: payload.experience,
      location: payload.location,
      employmentType: payload.employment_type,
    });
    return normalizeVacancy(response.data.referral);
  },

  update: async (id: string, payload: Partial<CreateVacancyPayload>): Promise<Vacancy> => {
    const response = await apiClient.put<ReferralResponse>(`/api/v1/referrals/${id}`, {
      referralId: id,
      title: payload.title,
      company: payload.company,
      vacancyUrl: payload.vacancy_url,
      description: payload.description,
      experience: payload.experience,
      location: payload.location,
      employmentType: payload.employment_type,
    });
    return normalizeVacancy(response.data.referral);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/referrals/${id}`);
  },
};
