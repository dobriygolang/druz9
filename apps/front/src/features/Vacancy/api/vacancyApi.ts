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

function normalizeEmploymentType(value: unknown): string {
  switch (value) {
    case 1:
    case 'EMPLOYMENT_TYPE_FULL_TIME':
    case 'full_time':
    case 'Full-time':
      return 'full_time';
    case 2:
    case 'EMPLOYMENT_TYPE_PART_TIME':
    case 'part_time':
    case 'Part-time':
      return 'part_time';
    case 3:
    case 'EMPLOYMENT_TYPE_CONTRACT':
    case 'contract':
    case 'Contract':
      return 'contract';
    case 4:
    case 'EMPLOYMENT_TYPE_INTERNSHIP':
    case 'internship':
    case 'Internship':
      return 'internship';
    case 5:
    case 'EMPLOYMENT_TYPE_REMOTE':
    case 'remote':
    case 'Remote':
    case 'Freelance':
      return 'remote';
    default:
      return '';
  }
}

function toEmploymentTypeEnum(value?: string): number {
  switch (value) {
    case 'full_time': return 1;
    case 'part_time': return 2;
    case 'contract': return 3;
    case 'internship': return 4;
    case 'remote': return 5;
    default: return 0;
  }
}

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
    employment_type: normalizeEmploymentType(r.employmentType),
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
      employmentType: toEmploymentTypeEnum(payload.employment_type),
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
      employmentType: toEmploymentTypeEnum(payload.employment_type),
    });
    return normalizeVacancy(response.data.referral);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/referrals/${id}`);
  },
};
