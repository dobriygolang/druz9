package circle

import (
	"context"

	"api/internal/model"
	v1 "api/pkg/api/circle/v1"
	commonv1 "api/pkg/api/common/v1"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

func (i *Implementation) JoinCircle(ctx context.Context, req *v1.JoinCircleRequest) (*v1.JoinCircleResponse, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok {
		return nil, errors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}

	circleID, err := uuid.Parse(req.CircleId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_CIRCLE_ID", "invalid circle id")
	}

	if err := i.service.JoinCircle(ctx, circleID, user.ID); err != nil {
		return nil, err
	}
	return &v1.JoinCircleResponse{Status: commonv1.OperationStatus_OPERATION_STATUS_OK}, nil
}
