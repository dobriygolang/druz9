package guild

import (
	"context"
	"fmt"

	"api/internal/apihelpers"
	v1 "api/pkg/api/guild/v1"
)

func (i *Implementation) CreateGuild(ctx context.Context, req *v1.CreateGuildRequest) (*v1.GuildResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}

	guild, err := i.service.CreateGuild(ctx, user.ID, req.GetName(), req.GetDescription(), req.GetTags(), req.GetIsPublic())
	if err != nil {
		return nil, fmt.Errorf("create guild: %w", err)
	}
	return &v1.GuildResponse{Guild: mapGuild(guild)}, nil
}
