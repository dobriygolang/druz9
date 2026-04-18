// Mirror of api/pkg/api/friend_challenge/v1 enums + messages.

export enum ChallengeStatus {
  UNSPECIFIED = 0,
  PENDING = 1,
  IN_PROGRESS = 2,
  COMPLETED = 3,
  EXPIRED = 4,
  DECLINED = 5,
}

export enum ChallengeDifficulty {
  UNSPECIFIED = 0,
  EASY = 1,
  MEDIUM = 2,
  HARD = 3,
}

export interface FriendChallenge {
  id: string
  challengerId: string
  challengerUsername: string
  opponentId: string
  opponentUsername: string
  taskTitle: string
  taskTopic: string
  taskDifficulty: ChallengeDifficulty
  taskRef: string
  note: string
  status: ChallengeStatus
  challengerSubmittedAt?: string
  challengerTimeMs: number
  challengerScore: number
  opponentSubmittedAt?: string
  opponentTimeMs: number
  opponentScore: number
  winnerId: string
  deadlineAt: string
  createdAt: string
  completedAt?: string
}

export interface ListChallengesResponse {
  challenges: FriendChallenge[]
  total: number
}

// UI-only derived status: what the viewer needs to do. Computed client-side
// from server status + current user id.
export type ViewerStatus =
  | 'your-turn' // you're the opponent and haven't submitted
  | 'their-turn' // opponent in progress, you already submitted
  | 'pending-them' // you're challenger, opponent hasn't started
  | 'pending-you' // you're challenger, you're waiting
  | 'won'
  | 'lost'
  | 'draw'
  | 'expired'
  | 'declined'

export function deriveViewerStatus(
  ch: FriendChallenge,
  currentUserId: string,
): ViewerStatus {
  const iAmChallenger = ch.challengerId === currentUserId
  const mySubmitted = iAmChallenger ? !!ch.challengerSubmittedAt : !!ch.opponentSubmittedAt
  const theirSubmitted = iAmChallenger ? !!ch.opponentSubmittedAt : !!ch.challengerSubmittedAt

  switch (ch.status) {
    case ChallengeStatus.COMPLETED: {
      if (!ch.winnerId) return 'draw'
      return ch.winnerId === currentUserId ? 'won' : 'lost'
    }
    case ChallengeStatus.EXPIRED:
      return 'expired'
    case ChallengeStatus.DECLINED:
      return 'declined'
    case ChallengeStatus.PENDING:
    case ChallengeStatus.IN_PROGRESS:
      if (!mySubmitted) {
        return iAmChallenger ? 'pending-them' : 'your-turn'
      }
      return theirSubmitted ? 'pending-them' : iAmChallenger ? 'pending-them' : 'their-turn'
    default:
      return 'pending-them'
  }
}
