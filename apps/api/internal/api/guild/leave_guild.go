package guild

import (
	"context"

	"github.com/go-kratos/kratos/v2/errors"

	"api/internal/apihelpers"
	commonv1 "api/pkg/api/common/v1"
	v1 "api/pkg/api/guild/v1"
)

func (i *Implementation) LeaveGuild(ctx context.Context, req *v1.LeaveGuildRequest) (*v1.LeaveGuildResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}

	guildID, err := apihelpers.ParseUUID(req.GetGuildId(), "INVALID_GUILD_ID", "guild_id")
	if err != nil {
		return nil, err
	}

	if err := i.service.LeaveGuild(ctx, guildID, user.ID); err != nil {
		return nil, errors.BadRequest("LEAVE_GUILD_FAILED", err.Error())
	}
	return &v1.LeaveGuildResponse{Status: commonv1.OperationStatus_OPERATION_STATUS_OK}, nil
}
