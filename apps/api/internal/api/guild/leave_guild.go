package guild

import (
	"context"

	"api/internal/model"
	v1 "api/pkg/api/guild/v1"
	commonv1 "api/pkg/api/common/v1"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

func (i *Implementation) LeaveGuild(ctx context.Context, req *v1.LeaveGuildRequest) (*v1.LeaveGuildResponse, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok {
		return nil, errors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}

	guildID, err := uuid.Parse(req.GuildId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_GUILD_ID", "invalid guild id")
	}

	if err := i.service.LeaveGuild(ctx, guildID, user.ID); err != nil {
		return nil, errors.BadRequest("LEAVE_GUILD_FAILED", err.Error())
	}
	return &v1.LeaveGuildResponse{Status: commonv1.OperationStatus_OPERATION_STATUS_OK}, nil
}
