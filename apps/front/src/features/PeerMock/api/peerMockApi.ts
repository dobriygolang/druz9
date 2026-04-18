import { apiClient } from '@/shared/api/base'

// Mirrors apps/api/api/learning/peer_mock/v1/peer_mock.proto.

export enum SlotType {
  UNSPECIFIED   = 0,
  ALGO          = 1,
  SYSTEM_DESIGN = 2,
  BEHAVIORAL    = 3,
  FULL          = 4,
}

export enum SlotLevel {
  UNSPECIFIED = 0,
  JUNIOR      = 1,
  MID         = 2,
  SENIOR      = 3,
}

export enum SlotStatus {
  UNSPECIFIED = 0,
  OPEN        = 1,
  BOOKED      = 2,
  COMPLETED   = 3,
  CANCELLED   = 4,
}

export enum BookingStatus {
  UNSPECIFIED           = 0,
  SCHEDULED             = 1,
  IN_PROGRESS           = 2,
  COMPLETED             = 3,
  CANCELLED_BY_BOOKER   = 4,
  CANCELLED_BY_OFFERER  = 5,
  NO_SHOW_BOOKER        = 6,
  NO_SHOW_OFFERER       = 7,
}

export interface Slot {
  id: string
  interviewerId: string
  interviewerName: string
  interviewerReliability: number
  startsAt: string
  endsAt: string
  type: SlotType
  level: SlotLevel
  priceGold: number
  status: SlotStatus
  note: string
}

export interface Booking {
  id: string
  slotId: string
  interviewerId: string
  interviewerName: string
  intervieweeId: string
  intervieweeName: string
  startsAt: string
  endsAt: string
  status: BookingStatus
  roomId: string
  priceGold: number
  reviewedByMe: boolean
}

export interface Reliability {
  score: number
  penaltyCount: number
  lastPenaltyAt?: string
  banUntil?: string
  tier: 'unranked' | 'reliable' | 'featured' | 'verified'
}

// Enum values arrive as strings ("SLOT_TYPE_ALGO") over grpc-gateway or
// as numbers from gRPC JSON; normalize to the numeric enum here.
function decodeType(v: unknown): SlotType {
  if (typeof v === 'number') return v
  switch (v) {
    case 'SLOT_TYPE_ALGO': return SlotType.ALGO
    case 'SLOT_TYPE_SYSTEM_DESIGN': return SlotType.SYSTEM_DESIGN
    case 'SLOT_TYPE_BEHAVIORAL': return SlotType.BEHAVIORAL
    case 'SLOT_TYPE_FULL': return SlotType.FULL
    default: return SlotType.UNSPECIFIED
  }
}
function decodeLevel(v: unknown): SlotLevel {
  if (typeof v === 'number') return v
  switch (v) {
    case 'SLOT_LEVEL_JUNIOR': return SlotLevel.JUNIOR
    case 'SLOT_LEVEL_MID':    return SlotLevel.MID
    case 'SLOT_LEVEL_SENIOR': return SlotLevel.SENIOR
    default: return SlotLevel.UNSPECIFIED
  }
}
function decodeSlotStatus(v: unknown): SlotStatus {
  if (typeof v === 'number') return v
  switch (v) {
    case 'SLOT_STATUS_OPEN':      return SlotStatus.OPEN
    case 'SLOT_STATUS_BOOKED':    return SlotStatus.BOOKED
    case 'SLOT_STATUS_COMPLETED': return SlotStatus.COMPLETED
    case 'SLOT_STATUS_CANCELLED': return SlotStatus.CANCELLED
    default: return SlotStatus.UNSPECIFIED
  }
}
function decodeBookingStatus(v: unknown): BookingStatus {
  if (typeof v === 'number') return v
  switch (v) {
    case 'BOOKING_STATUS_SCHEDULED':             return BookingStatus.SCHEDULED
    case 'BOOKING_STATUS_IN_PROGRESS':           return BookingStatus.IN_PROGRESS
    case 'BOOKING_STATUS_COMPLETED':             return BookingStatus.COMPLETED
    case 'BOOKING_STATUS_CANCELLED_BY_BOOKER':   return BookingStatus.CANCELLED_BY_BOOKER
    case 'BOOKING_STATUS_CANCELLED_BY_OFFERER':  return BookingStatus.CANCELLED_BY_OFFERER
    case 'BOOKING_STATUS_NO_SHOW_BOOKER':        return BookingStatus.NO_SHOW_BOOKER
    case 'BOOKING_STATUS_NO_SHOW_OFFERER':       return BookingStatus.NO_SHOW_OFFERER
    default: return BookingStatus.UNSPECIFIED
  }
}

function normalizeSlot(s: any): Slot {
  return {
    id: s.id,
    interviewerId: s.interviewerId ?? '',
    interviewerName: s.interviewerName ?? '',
    interviewerReliability: s.interviewerReliability ?? 100,
    startsAt: s.startsAt,
    endsAt: s.endsAt,
    type: decodeType(s.type),
    level: decodeLevel(s.level),
    priceGold: s.priceGold ?? 0,
    status: decodeSlotStatus(s.status),
    note: s.note ?? '',
  }
}

function normalizeBooking(b: any): Booking {
  return {
    id: b.id,
    slotId: b.slotId,
    interviewerId: b.interviewerId ?? '',
    interviewerName: b.interviewerName ?? '',
    intervieweeId: b.intervieweeId ?? '',
    intervieweeName: b.intervieweeName ?? '',
    startsAt: b.startsAt,
    endsAt: b.endsAt,
    status: decodeBookingStatus(b.status),
    roomId: b.roomId ?? '',
    priceGold: b.priceGold ?? 0,
    reviewedByMe: Boolean(b.reviewedByMe),
  }
}

export const peerMockApi = {
  createSlot: async (payload: {
    startsAt: string
    endsAt: string
    type: SlotType
    level: SlotLevel
    priceGold: number
    note?: string
  }): Promise<Slot> => {
    const r = await apiClient.post<{ slot?: any }>('/api/v1/peer-mocks/slots', payload)
    return normalizeSlot(r.data.slot ?? {})
  },

  listOpen: async (params?: { type?: SlotType; level?: SlotLevel; limit?: number }): Promise<Slot[]> => {
    const r = await apiClient.get<{ slots?: any[] }>('/api/v1/peer-mocks/slots', {
      params: {
        type: params?.type ?? SlotType.UNSPECIFIED,
        level: params?.level ?? SlotLevel.UNSPECIFIED,
        limit: params?.limit ?? 50,
      },
    })
    return (r.data.slots ?? []).map(normalizeSlot)
  },

  listMine: async (): Promise<Slot[]> => {
    const r = await apiClient.get<{ slots?: any[] }>('/api/v1/peer-mocks/slots/mine')
    return (r.data.slots ?? []).map(normalizeSlot)
  },

  cancelSlot: async (slotId: string): Promise<Slot> => {
    const r = await apiClient.post<{ slot?: any }>(`/api/v1/peer-mocks/slots/${slotId}/cancel`, {})
    return normalizeSlot(r.data.slot ?? {})
  },

  book: async (slotId: string): Promise<Booking> => {
    const r = await apiClient.post<{ booking?: any }>(`/api/v1/peer-mocks/slots/${slotId}/book`, {})
    return normalizeBooking(r.data.booking ?? {})
  },

  listBookings: async (): Promise<{ asInterviewer: Booking[]; asInterviewee: Booking[] }> => {
    const r = await apiClient.get<{ asInterviewer?: any[]; asInterviewee?: any[] }>(
      '/api/v1/peer-mocks/bookings',
    )
    return {
      asInterviewer: (r.data.asInterviewer ?? []).map(normalizeBooking),
      asInterviewee: (r.data.asInterviewee ?? []).map(normalizeBooking),
    }
  },

  cancelBooking: async (bookingId: string): Promise<{ booking: Booking; xpDelta: number; reliabilityDelta: number }> => {
    const r = await apiClient.post<{ booking?: any; xpDelta?: number; reliabilityDelta?: number }>(
      `/api/v1/peer-mocks/bookings/${bookingId}/cancel`,
      {},
    )
    return {
      booking: normalizeBooking(r.data.booking ?? {}),
      xpDelta: r.data.xpDelta ?? 0,
      reliabilityDelta: r.data.reliabilityDelta ?? 0,
    }
  },

  submitReview: async (bookingId: string, rating: number, notes = ''): Promise<Booking> => {
    const r = await apiClient.post<{ booking?: any }>(
      `/api/v1/peer-mocks/bookings/${bookingId}/review`,
      { rating, notes },
    )
    return normalizeBooking(r.data.booking ?? {})
  },

  getReliability: async (): Promise<Reliability> => {
    const r = await apiClient.get<Reliability>('/api/v1/peer-mocks/reliability')
    return {
      score: r.data.score ?? 100,
      penaltyCount: r.data.penaltyCount ?? 0,
      lastPenaltyAt: r.data.lastPenaltyAt,
      banUntil: r.data.banUntil,
      tier: r.data.tier ?? 'unranked',
    }
  },
}
