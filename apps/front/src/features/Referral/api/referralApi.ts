import { apiClient, type ListQueryParams, withDefaultListQuery } from '@/shared/api/base'
import type { Referral } from '@/entities/Referral/model/types'

interface ReferralRaw {
  id: string
  title: string
  company: string
  vacancy_url: string
  description: string
  experience: string
  location: string
  employment_type: string
  creator_id: string
  created_at: string
}

interface ReferralListResponse {
  referrals: ReferralRaw[]
  limit: number
  offset: number
  total_count: number
  has_next_page: boolean
}

function normalize(raw: ReferralRaw): Referral {
  return {
    id: raw.id,
    title: raw.title,
    company: raw.company,
    vacancyUrl: raw.vacancy_url,
    description: raw.description,
    experience: raw.experience,
    location: raw.location,
    employmentType: raw.employment_type,
    creatorId: raw.creator_id,
    createdAt: raw.created_at,
  }
}

export interface CreateReferralData {
  title: string
  company: string
  vacancy_url: string
  description: string
  experience: string
  location: string
  employment_type: string
}

export const referralApi = {
  async list(params?: ListQueryParams) {
    const query = withDefaultListQuery(params)
    const res = await apiClient.get<ReferralListResponse>('/api/v1/referrals', { params: query })
    return {
      referrals: res.data.referrals.map(normalize),
      limit: res.data.limit,
      offset: res.data.offset,
      totalCount: res.data.total_count,
      hasNextPage: res.data.has_next_page,
    }
  },

  async create(data: CreateReferralData) {
    const res = await apiClient.post<{ referral: ReferralRaw }>('/api/v1/referrals', data)
    return normalize(res.data.referral)
  },

  async update(id: string, data: Partial<CreateReferralData>) {
    const res = await apiClient.put<{ referral: ReferralRaw }>(`/api/v1/referrals/${id}`, data)
    return normalize(res.data.referral)
  },

  async remove(id: string) {
    await apiClient.delete(`/api/v1/referrals/${id}`)
  },
}
