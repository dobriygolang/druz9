package circle

import (
	"context"

	"api/internal/model"
	v1 "api/pkg/api/circle/v1"

	"github.com/go-kratos/kratos/v2/errors"
)

func (i *Implementation) ListCircles(ctx context.Context, req *v1.ListCirclesRequest) (*v1.ListCirclesResponse, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok {
		return nil, errors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}

	opts := model.ListCirclesOptions{
		Limit:  req.Limit,
		Offset: req.Offset,
	}

	resp, err := i.service.ListCircles(ctx, user.ID, opts)
	if err != nil {
		return nil, err
	}

	return mapListCirclesResponse(resp), nil
}
