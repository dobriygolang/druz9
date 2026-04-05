package circle

import (
	"context"

	"api/internal/model"
	v1 "api/pkg/api/circle/v1"

	"github.com/go-kratos/kratos/v2/errors"
)

func (i *Implementation) CreateCircle(ctx context.Context, req *v1.CreateCircleRequest) (*v1.CircleResponse, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok {
		return nil, errors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}

	circle, err := i.service.CreateCircle(ctx, user.ID, req.Name, req.Description, req.Tags)
	if err != nil {
		return nil, err
	}
	return &v1.CircleResponse{Circle: mapCircle(circle)}, nil
}
