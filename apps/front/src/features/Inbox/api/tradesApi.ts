import { apiClient } from '@/shared/api/base'

export interface Trade {
  id: string
  initiatorId: string
  initiatorName: string
  counterpartyId: string
  initiatorItemId: string
  initiatorItemName: string
  initiatorItemIcon: string
  counterpartyItemId: string
  counterpartyItemName: string
  counterpartyItemIcon: string
  note: string
  status: 'pending' | 'accepted' | 'cancelled' | 'declined' | 'expired'
  proposedAt?: string
  decidedAt?: string
}

interface RawTrade {
  id?: string
  initiatorId?: string
  initiatorName?: string
  counterpartyId?: string
  initiatorItemId?: string
  initiatorItemName?: string
  initiatorItemIcon?: string
  counterpartyItemId?: string
  counterpartyItemName?: string
  counterpartyItemIcon?: string
  note?: string
  status?: string
  proposedAt?: string
  decidedAt?: string
}

function normalize(t: RawTrade): Trade {
  return {
    id: t.id ?? '',
    initiatorId: t.initiatorId ?? '',
    initiatorName: t.initiatorName ?? '',
    counterpartyId: t.counterpartyId ?? '',
    initiatorItemId: t.initiatorItemId ?? '',
    initiatorItemName: t.initiatorItemName ?? '',
    initiatorItemIcon: t.initiatorItemIcon ?? '',
    counterpartyItemId: t.counterpartyItemId ?? '',
    counterpartyItemName: t.counterpartyItemName ?? '',
    counterpartyItemIcon: t.counterpartyItemIcon ?? '',
    note: t.note ?? '',
    status: (t.status as Trade['status']) ?? 'pending',
    proposedAt: t.proposedAt,
    decidedAt: t.decidedAt,
  }
}

export const tradesApi = {
  async listReceived(status?: string): Promise<Trade[]> {
    const r = await apiClient.get<{ trades?: RawTrade[] }>('/api/v1/inbox/trades/received', { params: { status } })
    return (r.data.trades ?? []).map(normalize)
  },
  async listSent(status?: string): Promise<Trade[]> {
    const r = await apiClient.get<{ trades?: RawTrade[] }>('/api/v1/inbox/trades/sent', { params: { status } })
    return (r.data.trades ?? []).map(normalize)
  },
  async create(payload: {
    counterpartyId: string
    initiatorItemId: string
    counterpartyItemId: string
    note?: string
  }): Promise<Trade> {
    const r = await apiClient.post<RawTrade>('/api/v1/inbox/trades', payload)
    return normalize(r.data)
  },
  async accept(tradeId: string): Promise<Trade> {
    const r = await apiClient.post<RawTrade>(`/api/v1/inbox/trades/${tradeId}/accept`, {})
    return normalize(r.data)
  },
  async cancel(tradeId: string): Promise<Trade> {
    const r = await apiClient.post<RawTrade>(`/api/v1/inbox/trades/${tradeId}/cancel`, {})
    return normalize(r.data)
  },
}
