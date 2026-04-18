package friend_challenge

import (
	"context"

	"github.com/google/uuid"

	"api/internal/model"
)

// Service is the interface consumed by transport handlers.
type Service interface {
	SendChallenge(
		ctx context.Context,
		challengerID uuid.UUID,
		opponentUsername, taskTitle, taskTopic, taskRef, note string,
		difficulty model.ChallengeDifficulty,
	) (*model.FriendChallenge, error)
	SubmitSolution(ctx context.Context, userID, challengeID uuid.UUID, timeMs, score int32) (*model.FriendChallenge, error)
	Decline(ctx context.Context, userID, challengeID uuid.UUID) (*model.FriendChallenge, error)
	ListIncoming(ctx context.Context, userID uuid.UUID, limit, offset int32) (*model.ChallengeList, error)
	ListSent(ctx context.Context, userID uuid.UUID, limit, offset int32) (*model.ChallengeList, error)
	ListHistory(ctx context.Context, userID uuid.UUID, limit, offset int32) (*model.ChallengeList, error)
}
