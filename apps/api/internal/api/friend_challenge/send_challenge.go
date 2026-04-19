package friend_challenge

import (
	"context"
	"fmt"
	goerr "errors"

	"github.com/go-kratos/kratos/v2/errors"

	"api/internal/apihelpers"
	friendchallengedomain "api/internal/domain/friend_challenge"
	"api/internal/model"
	v1 "api/pkg/api/friend_challenge/v1"
)

func (i *Implementation) SendChallenge(ctx context.Context, req *v1.SendChallengeRequest) (*v1.SendChallengeResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}
	ch, err := i.service.SendChallenge(
		ctx, user.ID,
		req.GetOpponentUsername(), req.GetTaskTitle(), req.GetTaskTopic(), req.GetTaskRef(), req.GetNote(),
		model.ChallengeDifficulty(req.GetTaskDifficulty()),
	)
	if err != nil {
		return nil, mapSendError(err)
	}
	return &v1.SendChallengeResponse{Challenge: mapChallenge(ch)}, nil
}

func mapSendError(err error) error {
	switch {
	case goerr.Is(err, friendchallengedomain.ErrOpponentNotFound):
		return errors.NotFound("OPPONENT_NOT_FOUND", "opponent user not found")
	case goerr.Is(err, friendchallengedomain.ErrCannotChallengeSelf):
		return errors.BadRequest("INVALID_OPPONENT", "cannot challenge yourself")
	case goerr.Is(err, friendchallengedomain.ErrTaskTitleMissing):
		return errors.BadRequest("INVALID_TASK", "task_title is required")
	case goerr.Is(err, friendchallengedomain.ErrNoteTooLong):
		return errors.BadRequest("NOTE_TOO_LONG", "note exceeds 400 characters")
	default:
		return errors.InternalServer("INTERNAL", "failed to create challenge")
	}
}
