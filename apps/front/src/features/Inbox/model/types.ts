// Thread kinds mirror proto `inbox.v1.ThreadKind`. Numeric values match.
export enum ThreadKind {
  UNSPECIFIED = 0,
  MENTOR = 1,
  GUILD = 2,
  SYSTEM = 3,
  DUEL = 4,
  CHALLENGE = 5,
}

export enum SenderKind {
  UNSPECIFIED = 0,
  USER = 1,
  SYSTEM = 2,
  MENTOR_BOT = 3,
  GUILD_BOT = 4,
}

export interface InboxThread {
  id: string
  kind: ThreadKind
  subject: string
  avatar: string
  preview: string
  unreadCount: number
  lastMessageAt: string // ISO timestamp
  externalId?: string
  interactive: boolean
}

export interface InboxMessage {
  id: string
  threadId: string
  senderKind: SenderKind
  senderId?: string
  senderName: string
  body: string
  read: boolean
  createdAt: string // ISO timestamp
}

export interface ListThreadsResponse {
  threads: InboxThread[]
  total: number
  unreadTotal: number
}

export interface GetThreadResponse {
  thread: InboxThread
  messages: InboxMessage[]
}

export interface MarkThreadReadResponse {
  ok: boolean
  unreadTotal: number
}

export interface SendMessageResponse {
  message: InboxMessage
}

export interface GetUnreadCountResponse {
  unreadTotal: number
}
