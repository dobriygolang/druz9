package guild

import (
	"context"

	"api/internal/model"
	"api/internal/notiftext"
	v1 "api/pkg/api/guild/v1"
	commonv1 "api/pkg/api/common/v1"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

func (i *Implementation) InviteToGuild(ctx context.Context, req *v1.InviteToGuildRequest) (*v1.InviteToGuildResponse, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok {
		return nil, errors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}

	guildID, err := uuid.Parse(req.GuildId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_GUILD_ID", "invalid guild id")
	}

	inviteeID, err := uuid.Parse(req.UserId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_USER_ID", "invalid user id")
	}

	if err := i.service.InviteToGuild(ctx, guildID, user.ID, inviteeID); err != nil {
		return nil, err
	}

	// Notify: guild_invite — send to the invitee.
	if i.notif != nil {
		go func() {
			i.notif.Send(ctx, inviteeID.String(), "guild_invite",
				notiftext.GuildInviteTitle(),
				notiftext.GuildInviteBody(user.FirstName),
				map[string]any{"guild_id": guildID.String(), "inviter_id": user.ID.String()})
		}()
	}

	return &v1.InviteToGuildResponse{Status: commonv1.OperationStatus_OPERATION_STATUS_INVITED}, nil
}
