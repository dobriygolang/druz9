export enum ReplaySourceKind {
  UNSPECIFIED = 0,
  ARENA = 1,
  CHALLENGE = 2,
}

export enum EventKind {
  UNSPECIFIED = 0,
  KEYSTROKE = 1,
  RUN = 2,
  SUBMIT_PASS = 3,
  SUBMIT_FAIL = 4,
  HINT = 5,
  MILESTONE = 6,
}

export interface ReplaySummary {
  id: string
  sourceKind: ReplaySourceKind
  sourceId: string
  player1Id: string
  player1Username: string
  player2Id: string
  player2Username: string
  taskTitle: string
  taskTopic: string
  taskDifficulty: number
  durationMs: number
  winnerId: string
  completedAt: string
}

export interface ReplayEvent {
  id: string
  userId: string
  tMs: number
  kind: EventKind
  label: string
  linesCount: number
}

export interface GetReplayResponse {
  summary: ReplaySummary
  events: ReplayEvent[]
}

export interface ListReplaysResponse {
  replays: ReplaySummary[]
  total: number
}
