package model

import (
	"time"

	"github.com/google/uuid"
)

// ChallengeStatus mirrors the proto enum values.
type ChallengeStatus int32

const (
	ChallengeStatusUnspecified ChallengeStatus = 0
	ChallengeStatusPending     ChallengeStatus = 1
	ChallengeStatusInProgress  ChallengeStatus = 2
	ChallengeStatusCompleted   ChallengeStatus = 3
	ChallengeStatusExpired     ChallengeStatus = 4
	ChallengeStatusDeclined    ChallengeStatus = 5
)

// ChallengeDifficulty mirrors the proto enum values.
type ChallengeDifficulty int32

const (
	ChallengeDifficultyUnspecified ChallengeDifficulty = 0
	ChallengeDifficultyEasy        ChallengeDifficulty = 1
	ChallengeDifficultyMedium      ChallengeDifficulty = 2
	ChallengeDifficultyHard        ChallengeDifficulty = 3
)

// FriendChallenge is the full row as stored in DB. Transport layer enriches
// it with sender/opponent usernames resolved from the users table.
type FriendChallenge struct {
	ID                    uuid.UUID           `json:"id"`
	ChallengerID          uuid.UUID           `json:"challengerId"`
	ChallengerUsername    string              `json:"challengerUsername"`
	OpponentID            uuid.UUID           `json:"opponentId"`
	OpponentUsername      string              `json:"opponentUsername"`
	TaskTitle             string              `json:"taskTitle"`
	TaskTopic             string              `json:"taskTopic"`
	TaskDifficulty        ChallengeDifficulty `json:"taskDifficulty"`
	TaskRef               string              `json:"taskRef"`
	Note                  string              `json:"note"`
	Status                ChallengeStatus     `json:"status"`
	ChallengerSubmittedAt *time.Time          `json:"challengerSubmittedAt,omitempty"`
	ChallengerTimeMs      *int32              `json:"challengerTimeMs,omitempty"`
	ChallengerScore       *int32              `json:"challengerScore,omitempty"`
	OpponentSubmittedAt   *time.Time          `json:"opponentSubmittedAt,omitempty"`
	OpponentTimeMs        *int32              `json:"opponentTimeMs,omitempty"`
	OpponentScore         *int32              `json:"opponentScore,omitempty"`
	WinnerID              *uuid.UUID          `json:"winnerId,omitempty"`
	DeadlineAt            time.Time           `json:"deadlineAt"`
	CreatedAt             time.Time           `json:"createdAt"`
	CompletedAt           *time.Time          `json:"completedAt,omitempty"`
}

// ChallengeList is the response shape for paginated endpoints.
type ChallengeList struct {
	Challenges []*FriendChallenge `json:"challenges"`
	Total      int32              `json:"total"`
}
