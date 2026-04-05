export type RoomMode = 'ROOM_MODE_UNSPECIFIED' | 'ROOM_MODE_ALL' | 'ROOM_MODE_DUEL'
export type RoomStatus = 'ROOM_STATUS_UNSPECIFIED' | 'ROOM_STATUS_WAITING' | 'ROOM_STATUS_ACTIVE' | 'ROOM_STATUS_FINISHED'
export type TaskDifficulty = 'TASK_DIFFICULTY_UNSPECIFIED' | 'TASK_DIFFICULTY_EASY' | 'TASK_DIFFICULTY_MEDIUM' | 'TASK_DIFFICULTY_HARD'
export type ProgrammingLanguage =
  | 'PROGRAMMING_LANGUAGE_UNSPECIFIED'
  | 'PROGRAMMING_LANGUAGE_JAVASCRIPT'
  | 'PROGRAMMING_LANGUAGE_TYPESCRIPT'
  | 'PROGRAMMING_LANGUAGE_PYTHON'
  | 'PROGRAMMING_LANGUAGE_GO'
  | 'PROGRAMMING_LANGUAGE_RUST'
  | 'PROGRAMMING_LANGUAGE_CPP'
  | 'PROGRAMMING_LANGUAGE_JAVA'

export interface Participant {
  userId: string
  name: string
  isGuest: boolean
  isReady: boolean
  isWinner: boolean
  joinedAt: string
  isCreator: boolean
}

export interface Room {
  id: string
  mode: RoomMode
  code: string
  status: RoomStatus
  inviteCode: string
  task: string
  createdAt: string
  participants: Participant[]
  taskId: string
  codeRevision: number
  creatorId: string
}

export interface Submission {
  id: string
  userId: string
  guestName: string
  code: string
  output: string
  error: string
  submittedAt: string
  durationMs: number
  isCorrect: boolean
  passedCount: number
  totalCount: number
}

export interface Task {
  id: string
  title: string
  slug: string
  statement: string
  difficulty: TaskDifficulty
  topics: string[]
  starterCode: string
  language: ProgrammingLanguage
  isActive: boolean
  publicTestCases: TaskTestCase[]
  hiddenTestCases: TaskTestCase[]
  createdAt: string
  updatedAt: string
}

export interface TaskTestCase {
  id: string
  input: string
  expectedOutput: string
  isPublic: boolean
  weight: number
  order: number
}
