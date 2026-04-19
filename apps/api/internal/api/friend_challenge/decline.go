package friend_challenge

import (
	"context"
	"fmt"
	goerr "errors"

	"github.com/go-kratos/kratos/v2/errors"

	"api/internal/apihelpers"
	friendchallengedomain "api/internal/domain/friend_challenge"
	v1 "api/pkg/api/friend_challenge/v1"
)

func (i *Implementation) Decline(ctx context.Context, req *v1.DeclineRequest) (*v1.DeclineResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}
	challengeID, parseErr := apihelpers.ParseUUID(req.GetChallengeId(), "INVALID_CHALLENGE_ID", "challenge_id")
	if parseErr != nil {
		return nil, fmt.Errorf("parse challenge id: %w", parseErr)
	}
	ch, err := i.service.Decline(ctx, user.ID, challengeID)
	if err != nil {
		return nil, mapDeclineError(err)
	}
	return &v1.DeclineResponse{Challenge: mapChallenge(ch)}, nil
}

func mapDeclineError(err error) error {
	switch {
	case goerr.Is(err, friendchallengedomain.ErrChallengeNotFound):
		return errors.NotFound("CHALLENGE_NOT_FOUND", "challenge does not exist")
	case goerr.Is(err, friendchallengedomain.ErrOnlyOpponentCanDecline):
		return errors.Forbidden("ONLY_OPPONENT_CAN_DECLINE", "only the opponent can decline a challenge")
	case goerr.Is(err, friendchallengedomain.ErrAlreadyCompleted),
		goerr.Is(err, friendchallengedomain.ErrAlreadyExpired),
		goerr.Is(err, friendchallengedomain.ErrAlreadyDeclined):
		return errors.Conflict("CHALLENGE_TERMINAL", "challenge is no longer actionable")
	default:
		return errors.InternalServer("INTERNAL", "failed to decline challenge")
	}
}
