package friend_challenge

import (
	"context"
	goerr "errors"
	"fmt"

	"github.com/go-kratos/kratos/v2/errors"

	"api/internal/apihelpers"
	friendchallengedomain "api/internal/domain/friend_challenge"
	v1 "api/pkg/api/friend_challenge/v1"
)

func (i *Implementation) SubmitSolution(ctx context.Context, req *v1.SubmitSolutionRequest) (*v1.SubmitSolutionResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}
	challengeID, parseErr := apihelpers.ParseUUID(req.GetChallengeId(), "INVALID_CHALLENGE_ID", "challenge_id")
	if parseErr != nil {
		return nil, fmt.Errorf("parse challenge id: %w", parseErr)
	}
	ch, err := i.service.SubmitSolution(ctx, user.ID, challengeID, req.GetTimeMs(), req.GetScore())
	if err != nil {
		return nil, mapSubmitError(err)
	}
	return &v1.SubmitSolutionResponse{Challenge: mapChallenge(ch)}, nil
}

func mapSubmitError(err error) error {
	switch {
	case goerr.Is(err, friendchallengedomain.ErrChallengeNotFound):
		return errors.NotFound("CHALLENGE_NOT_FOUND", "challenge does not exist")
	case goerr.Is(err, friendchallengedomain.ErrNotParticipant):
		return errors.Forbidden("NOT_PARTICIPANT", "you are not a participant of this challenge")
	case goerr.Is(err, friendchallengedomain.ErrAlreadyCompleted):
		return errors.Conflict("CHALLENGE_COMPLETED", "challenge is already completed")
	case goerr.Is(err, friendchallengedomain.ErrAlreadyExpired):
		return errors.Conflict("CHALLENGE_EXPIRED", "challenge deadline has passed")
	case goerr.Is(err, friendchallengedomain.ErrAlreadyDeclined):
		return errors.Conflict("CHALLENGE_DECLINED", "challenge was declined")
	case goerr.Is(err, friendchallengedomain.ErrAlreadySubmitted):
		return errors.Conflict("ALREADY_SUBMITTED", "you already submitted to this challenge")
	case goerr.Is(err, friendchallengedomain.ErrBadScore):
		return errors.BadRequest("INVALID_SCORE", "score must be between 0 and 5")
	case goerr.Is(err, friendchallengedomain.ErrBadTime):
		return errors.BadRequest("INVALID_TIME", "time_ms must be positive")
	default:
		return errors.InternalServer("INTERNAL", "failed to submit solution")
	}
}
