package guild

import (
	"context"
	"fmt"

	"api/internal/apihelpers"
	"api/internal/clients/notification/notiftext"
	commonv1 "api/pkg/api/common/v1"
	v1 "api/pkg/api/guild/v1"
)

func (i *Implementation) InviteToGuild(ctx context.Context, req *v1.InviteToGuildRequest) (*v1.InviteToGuildResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}

	guildID, err := apihelpers.ParseUUID(req.GetGuildId(), "INVALID_GUILD_ID", "guild_id")
	if err != nil {
		return nil, fmt.Errorf("parse guild_id: %w", err)
	}

	inviteeID, err := apihelpers.ParseUUID(req.GetUserId(), "INVALID_USER_ID", "user_id")
	if err != nil {
		return nil, fmt.Errorf("parse user_id: %w", err)
	}

	if err := i.service.InviteToGuild(ctx, guildID, user.ID, inviteeID); err != nil {
		return nil, fmt.Errorf("invite to guild: %w", err)
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
