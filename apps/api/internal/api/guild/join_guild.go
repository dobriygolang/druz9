package guild

import (
	"context"
	"fmt"

	"api/internal/apihelpers"
	commonv1 "api/pkg/api/common/v1"
	v1 "api/pkg/api/guild/v1"
)

func (i *Implementation) JoinGuild(ctx context.Context, req *v1.JoinGuildRequest) (*v1.JoinGuildResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}

	guildID, err := apihelpers.ParseUUID(req.GetGuildId(), "INVALID_GUILD_ID", "guild_id")
	if err != nil {
		return nil, fmt.Errorf("parse guild_id: %w", err)
	}

	if err := i.service.JoinGuild(ctx, guildID, user.ID); err != nil {
		return nil, fmt.Errorf("join guild: %w", err)
	}
	return &v1.JoinGuildResponse{Status: commonv1.OperationStatus_OPERATION_STATUS_OK}, nil
}
