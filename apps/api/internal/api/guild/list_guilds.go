package guild

import (
	"context"

	"api/internal/apihelpers"
	"api/internal/model"
	v1 "api/pkg/api/guild/v1"
)

func (i *Implementation) ListGuilds(ctx context.Context, req *v1.ListGuildsRequest) (*v1.ListGuildsResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}

	opts := model.ListGuildsOptions{
		Limit:  req.GetLimit(),
		Offset: req.GetOffset(),
	}

	resp, err := i.service.ListGuilds(ctx, user.ID, opts)
	if err != nil {
		return nil, err
	}

	return mapListGuildsResponse(resp), nil
}
