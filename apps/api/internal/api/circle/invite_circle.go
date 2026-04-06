package circle

import (
	"context"

	"api/internal/model"
	v1 "api/pkg/api/circle/v1"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

func (i *Implementation) InviteToCircle(ctx context.Context, req *v1.InviteToCircleRequest) (*v1.InviteToCircleResponse, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok {
		return nil, errors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}

	circleID, err := uuid.Parse(req.CircleId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_CIRCLE_ID", "invalid circle id")
	}

	inviteeID, err := uuid.Parse(req.UserId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_USER_ID", "invalid user id")
	}

	if err := i.service.InviteToCircle(ctx, circleID, user.ID, inviteeID); err != nil {
		return nil, err
	}
	return &v1.InviteToCircleResponse{Status: "invited"}, nil
}
