// #5 — Gift / trade client. The text-message endpoints stay temporarily
// (legacy data + Telegram bot link); /inbox UI surfaces this list as the
// new "Подарки" tab and the previous send-message form is retired.
import { apiClient } from '@/shared/api/base'

export interface Gift {
  id: string
  senderId: string
  senderName: string
  recipientId: string
  itemId: string
  itemName: string
  itemIconRef: string
  note: string
  status: 'pending' | 'claimed' | 'declined' | 'expired'
  sentAt?: string
  decidedAt?: string
}

interface RawGift {
  id?: string
  senderId?: string
  senderName?: string
  recipientId?: string
  itemId?: string
  itemName?: string
  itemIconRef?: string
  note?: string
  status?: string
  sentAt?: string
  decidedAt?: string
}

function normalize(g: RawGift): Gift {
  return {
    id: g.id ?? '',
    senderId: g.senderId ?? '',
    senderName: g.senderName ?? '',
    recipientId: g.recipientId ?? '',
    itemId: g.itemId ?? '',
    itemName: g.itemName ?? '',
    itemIconRef: g.itemIconRef ?? '',
    note: g.note ?? '',
    status: (g.status as Gift['status']) ?? 'pending',
    sentAt: g.sentAt,
    decidedAt: g.decidedAt,
  }
}

export const giftsApi = {
  async listReceived(status?: string): Promise<Gift[]> {
    const r = await apiClient.get<{ gifts?: RawGift[] }>('/api/v1/inbox/gifts/received', { params: { status } })
    return (r.data.gifts ?? []).map(normalize)
  },
  async listSent(status?: string): Promise<Gift[]> {
    const r = await apiClient.get<{ gifts?: RawGift[] }>('/api/v1/inbox/gifts/sent', { params: { status } })
    return (r.data.gifts ?? []).map(normalize)
  },
  async send(recipientId: string, itemId: string, note: string): Promise<Gift> {
    const r = await apiClient.post<RawGift>('/api/v1/inbox/gifts', { recipientId, itemId, note })
    return normalize(r.data)
  },
  async claim(giftId: string): Promise<Gift> {
    const r = await apiClient.post<RawGift>(`/api/v1/inbox/gifts/${giftId}/claim`, {})
    return normalize(r.data)
  },
  async decline(giftId: string): Promise<Gift> {
    const r = await apiClient.post<RawGift>(`/api/v1/inbox/gifts/${giftId}/decline`, {})
    return normalize(r.data)
  },
}
