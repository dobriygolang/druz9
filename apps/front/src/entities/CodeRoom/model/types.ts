// Типы для CodeRoom (онлайн редактор Go кода)

// Enum с бэкенда (числовые значения)
export enum RoomMode {
  ROOM_MODE_UNSPECIFIED = 0,
  ROOM_MODE_ALL = 1,   // collaborative mode
  ROOM_MODE_DUEL = 2,  // duel mode (two users race)
}

export enum RoomStatus {
  ROOM_STATUS_UNSPECIFIED = 0,
  ROOM_STATUS_WAITING = 1,   // waiting for participants
  ROOM_STATUS_ACTIVE = 2,    // room is active
  ROOM_STATUS_FINISHED = 3,  // duel finished
}

// Удобные алиасы для использования в коде
export type CodeRoomMode = 'all' | 'duel';
export type CodeRoomStatus = 'waiting' | 'active' | 'finished';
export type ParticipantRole = 'creator' | 'member';

// Маппинг enum <-> string для API
export const roomModeToEnum = (mode: CodeRoomMode): RoomMode => {
  return mode === 'duel' ? RoomMode.ROOM_MODE_DUEL : RoomMode.ROOM_MODE_ALL;
};

export const enumToRoomMode = (value: RoomMode): CodeRoomMode => {
  return value === RoomMode.ROOM_MODE_DUEL ? 'duel' : 'all';
};

export const roomStatusToEnum = (status: CodeRoomStatus): RoomStatus => {
  switch (status) {
    case 'waiting': return RoomStatus.ROOM_STATUS_WAITING;
    case 'active': return RoomStatus.ROOM_STATUS_ACTIVE;
    case 'finished': return RoomStatus.ROOM_STATUS_FINISHED;
    default: return RoomStatus.ROOM_STATUS_WAITING;
  }
};

export const enumToRoomStatus = (value: RoomStatus): CodeRoomStatus => {
  switch (value) {
    case RoomStatus.ROOM_STATUS_WAITING: return 'waiting';
    case RoomStatus.ROOM_STATUS_ACTIVE: return 'active';
    case RoomStatus.ROOM_STATUS_FINISHED: return 'finished';
    default: return 'waiting';
  }
};

export interface Participant {
  id: string;
  userId: string | null; // null для гостя
  displayName: string; // никнейм или "Гость"
  isGuest: boolean;
  role: ParticipantRole;
  isReady: boolean;
  joinedAt: string;
  isActive?: boolean;
  // для дуэли
  score?: number;
}

export interface CodeRoom {
  id: string;
  title: string;
  mode: CodeRoomMode;
  language: 'go';
  inviteCode: string;
  creatorId: string;
  code: string;
  codeRevision: number;
  status: CodeRoomStatus;
  task?: string;
  taskId?: string;
  maxParticipants: number; // standard: 10, duel: 2
  participants: Participant[];
  createdAt: string;
  updatedAt: string;
}

export interface CodeTaskCase {
  id: string;
  input: string;
  expectedOutput: string;
  isPublic: boolean;
  weight: number;
  order: number;
}

export interface CodeTask {
  id: string;
  title: string;
  slug: string;
  statement: string;
  difficulty: string;
  topics: string[];
  starterCode: string;
  language: string;
  taskType: string;
  executionProfile: string;
  runnerMode: string;
  durationSeconds: number;
  fixtureFiles: string[];
  readablePaths: string[];
  writablePaths: string[];
  allowedHosts: string[];
  allowedPorts: number[];
  mockEndpoints: string[];
  writableTempDir: boolean;
  isActive: boolean;
  publicTestCases: CodeTaskCase[];
  hiddenTestCases: CodeTaskCase[];
  createdAt: string;
  updatedAt: string;
}

export interface CodeLeaderboardEntry {
  userId: string;
  displayName: string;
  wins: number;
  matches: number;
  winRate: number;
  bestSolveMs: number;
}

export interface RunCodeResponse {
  output: string;
  error?: string;
  exitCode: number;
  executionTimeMs: number;
}

export interface Submission {
  id: string;
  code: string;
  output: string;
  error?: string;
  exitCode: number;
  executionTimeMs: number;
  submittedBy: string;
  submittedByName: string;
  submittedAt: string;
}

export type ArenaMatchStatus = 'waiting' | 'active' | 'finished';

export interface ArenaPlayer {
  userId: string;
  displayName: string;
  side: 'left' | 'right' | string;
  isCreator: boolean;
  currentCode?: string;
  freezeUntil?: string;
  acceptedAt?: string;
  suspicionCount?: number;
  antiCheatPenalized?: boolean;
  bestRuntimeMs: number;
  isWinner: boolean;
  joinedAt: string;
}

export interface ArenaMatch {
  id: string;
  taskId: string;
  taskTitle: string;
  taskStatement: string;
  starterCode: string;
  topic: string;
  difficulty: string;
  status: ArenaMatchStatus;
  durationSeconds: number;
  obfuscateOpponent: boolean;
  isRated?: boolean;
  unratedReason?: string;
  antiCheatEnabled?: boolean;
  winnerUserId?: string;
  winnerReason?: string;
  startedAt?: string;
  finishedAt?: string;
  createdAt?: string;
  players: ArenaPlayer[];
}

export interface ArenaLeaderboardEntry {
  userId: string;
  displayName: string;
  rating: number;
  league: string;
  wins: number;
  losses: number;
  matches: number;
  winRate: number;
  bestRuntime: number;
}

export interface ArenaQueueState {
  status: 'idle' | 'queued' | 'matched' | string;
  topic?: string;
  difficulty?: string;
  queuedAt?: string;
  queueSize?: number;
  match?: ArenaMatch;
}

export interface ArenaPlayerStats {
  userId: string;
  displayName: string;
  rating: number;
  league: string;
  wins: number;
  losses: number;
  matches: number;
  winRate: number;
  bestRuntime: number;
}
