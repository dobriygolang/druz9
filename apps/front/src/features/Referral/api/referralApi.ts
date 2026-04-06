import { apiClient, type ListQueryParams, withDefaultListQuery } from '@/shared/api/base'
import type { Referral } from '@/entities/Referral/model/types'

interface ReferralRaw {
  id: string
  title: string
  company: string
  vacancyUrl: string
  description: string
  experience: string
  location: string
  employmentType: string
  creatorId: string
  createdAt: string
}

interface ReferralListResponse {
  referrals: ReferralRaw[]
  limit: number
  offset: number
  totalCount: number
  hasNextPage: boolean
}

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  EMPLOYMENT_TYPE_FULL_TIME:   'Full-time',
  EMPLOYMENT_TYPE_PART_TIME:   'Part-time',
  EMPLOYMENT_TYPE_CONTRACT:    'Contract',
  EMPLOYMENT_TYPE_INTERNSHIP:  'Internship',
  EMPLOYMENT_TYPE_REMOTE:      'Remote',
}

function normalize(raw: ReferralRaw): Referral {
  return {
    id: raw.id,
    title: raw.title,
    company: raw.company,
    vacancyUrl: raw.vacancyUrl,
    description: raw.description,
    experience: raw.experience,
    location: raw.location,
    employmentType: EMPLOYMENT_TYPE_LABELS[raw.employmentType] ?? raw.employmentType,
    creatorId: raw.creatorId,
    createdAt: raw.createdAt,
  }
}

export interface CreateReferralData {
  title: string
  company: string
  vacancyUrl: string
  description: string
  experience: string
  location: string
  employmentType: string
}

export const referralApi = {
  async list(params?: ListQueryParams) {
    const query = withDefaultListQuery(params)
    const res = await apiClient.get<ReferralListResponse>('/api/v1/referrals', { params: query })
    return {
      referrals: res.data.referrals.map(normalize),
      limit: res.data.limit,
      offset: res.data.offset,
      totalCount: res.data.totalCount,
      hasNextPage: res.data.hasNextPage,
    }
  },

  async create(data: CreateReferralData) {
    // Strip empty employmentType — gRPC-gateway fails to parse "" as a proto enum
    const payload = { ...data } as Record<string, unknown>
    if (!payload.employmentType) delete payload.employmentType
    const res = await apiClient.post<{ referral: ReferralRaw }>('/api/v1/referrals', { referral: payload })
    return normalize(res.data.referral)
  },

  async update(id: string, data: Partial<CreateReferralData>) {
    const res = await apiClient.put<{ referral: ReferralRaw }>(`/api/v1/referrals/${id}`, { referral: data })
    return normalize(res.data.referral)
  },

  async remove(id: string) {
    await apiClient.delete(`/api/v1/referrals/${id}`)
  },
}
