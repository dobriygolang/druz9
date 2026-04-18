package guild

import (
	"context"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"

	"api/internal/apihelpers"
	v1 "api/pkg/api/guild/v1"
)

func (i *Implementation) UpdateGuildSettings(ctx context.Context, req *v1.UpdateGuildSettingsRequest) (*v1.UpdateGuildSettingsResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}
	guildID, err := uuid.Parse(req.GetGuildId())
	if err != nil {
		return nil, errors.BadRequest("INVALID_GUILD_ID", "invalid guild_id")
	}
	if req.GetName() == "" {
		return nil, errors.BadRequest("INVALID_NAME", "guild name is required")
	}
	if i.warRepo == nil {
		return nil, errors.InternalServer("NOT_CONFIGURED", "guild store not configured")
	}
	guild, err := i.warRepo.UpdateGuildSettings(ctx, user.ID, guildID, req.GetName(), req.GetDescription(), req.GetIsPublic())
	if err != nil {
		if err.Error() == "permission denied" {
			return nil, errors.Forbidden("FORBIDDEN", "only creators and officers can update guild settings")
		}
		return nil, errors.InternalServer("INTERNAL", "failed to update guild settings")
	}
	return &v1.UpdateGuildSettingsResponse{Guild: mapGuild(guild)}, nil
}
