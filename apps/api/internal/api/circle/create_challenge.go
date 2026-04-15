package circle

import (
	"context"

	"api/internal/model"
	v1 "api/pkg/api/circle/v1"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

func (i *Implementation) CreateCircleChallenge(ctx context.Context, req *v1.CreateCircleChallengeRequest) (*v1.CreateCircleChallengeResponse, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok {
		return nil, errors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}

	circleID, err := uuid.Parse(req.CircleId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_CIRCLE_ID", "invalid circle_id")
	}

	challenge, err := i.service.CreateChallenge(ctx, circleID, user.ID, req.TemplateKey, req.TargetValue)
	if err != nil {
		return nil, err
	}

	return &v1.CreateCircleChallengeResponse{
		Challenge: mapChallenge(challenge),
	}, nil
}
