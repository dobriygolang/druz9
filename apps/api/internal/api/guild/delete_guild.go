package guild

import (
	"context"
	"fmt"

	"api/internal/apihelpers"
	commonv1 "api/pkg/api/common/v1"
	v1 "api/pkg/api/guild/v1"
)

func (i *Implementation) DeleteGuild(ctx context.Context, req *v1.DeleteGuildRequest) (*v1.DeleteGuildResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}

	guildID, err := apihelpers.ParseUUID(req.GetGuildId(), "INVALID_GUILD_ID", "guild_id")
	if err != nil {
		return nil, err
	}

	if err := i.service.DeleteGuild(ctx, guildID, user.ID); err != nil {
		return nil, fmt.Errorf("delete guild: %w", err)
	}
	return &v1.DeleteGuildResponse{Status: commonv1.OperationStatus_OPERATION_STATUS_OK}, nil
}
