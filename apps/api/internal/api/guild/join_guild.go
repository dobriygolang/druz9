package guild

import (
	"context"

	"api/internal/model"
	v1 "api/pkg/api/guild/v1"
	commonv1 "api/pkg/api/common/v1"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

func (i *Implementation) JoinGuild(ctx context.Context, req *v1.JoinGuildRequest) (*v1.JoinGuildResponse, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok {
		return nil, errors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}

	guildID, err := uuid.Parse(req.GuildId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_GUILD_ID", "invalid guild id")
	}

	if err := i.service.JoinGuild(ctx, guildID, user.ID); err != nil {
		return nil, err
	}
	return &v1.JoinGuildResponse{Status: commonv1.OperationStatus_OPERATION_STATUS_OK}, nil
}
