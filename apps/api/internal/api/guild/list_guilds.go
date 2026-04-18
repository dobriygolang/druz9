package guild

import (
	"context"

	"api/internal/model"
	v1 "api/pkg/api/guild/v1"

	"github.com/go-kratos/kratos/v2/errors"
)

func (i *Implementation) ListGuilds(ctx context.Context, req *v1.ListGuildsRequest) (*v1.ListGuildsResponse, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok {
		return nil, errors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}

	opts := model.ListGuildsOptions{
		Limit:  req.Limit,
		Offset: req.Offset,
	}

	resp, err := i.service.ListGuilds(ctx, user.ID, opts)
	if err != nil {
		return nil, err
	}

	return mapListGuildsResponse(resp), nil
}
