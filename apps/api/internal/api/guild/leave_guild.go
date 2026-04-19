package guild

import (
	"context"
	"fmt"

	"api/internal/apihelpers"
	commonv1 "api/pkg/api/common/v1"
	v1 "api/pkg/api/guild/v1"
)

func (i *Implementation) LeaveGuild(ctx context.Context, req *v1.LeaveGuildRequest) (*v1.LeaveGuildResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}

	guildID, err := apihelpers.ParseUUID(req.GetGuildId(), "INVALID_GUILD_ID", "guild_id")
	if err != nil {
		return nil, fmt.Errorf("parse guild_id: %w", err)
	}

	if err := i.service.LeaveGuild(ctx, guildID, user.ID); err != nil {
		return nil, fmt.Errorf("leave guild: %w", err)
	}
	return &v1.LeaveGuildResponse{Status: commonv1.OperationStatus_OPERATION_STATUS_OK}, nil
}
