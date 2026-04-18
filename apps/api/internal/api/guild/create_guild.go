package guild

import (
	"context"

	"api/internal/model"
	v1 "api/pkg/api/guild/v1"

	"github.com/go-kratos/kratos/v2/errors"
)

func (i *Implementation) CreateGuild(ctx context.Context, req *v1.CreateGuildRequest) (*v1.GuildResponse, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok {
		return nil, errors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}

	guild, err := i.service.CreateGuild(ctx, user.ID, req.Name, req.Description, req.Tags, req.IsPublic)
	if err != nil {
		return nil, err
	}
	return &v1.GuildResponse{Guild: mapGuild(guild)}, nil
}
