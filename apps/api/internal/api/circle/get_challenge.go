package circle

import (
	"context"

	"api/internal/model"
	v1 "api/pkg/api/circle/v1"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

func (i *Implementation) GetActiveCircleChallenge(ctx context.Context, req *v1.GetActiveCircleChallengeRequest) (*v1.GetActiveCircleChallengeResponse, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok {
		return nil, errors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}

	circleID, err := uuid.Parse(req.CircleId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_CIRCLE_ID", "invalid circle_id")
	}

	challenge, err := i.service.GetActiveChallenge(ctx, circleID, user.ID)
	if err != nil {
		return nil, err
	}

	return &v1.GetActiveCircleChallengeResponse{
		Challenge: mapChallenge(challenge),
	}, nil
}
