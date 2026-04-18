package guild

import (
	"context"

	"api/internal/apihelpers"
	"api/internal/notiftext"
	commonv1 "api/pkg/api/common/v1"
	v1 "api/pkg/api/guild/v1"
)

func (i *Implementation) InviteToGuild(ctx context.Context, req *v1.InviteToGuildRequest) (*v1.InviteToGuildResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}

	guildID, err := apihelpers.ParseUUID(req.GuildId, "INVALID_GUILD_ID", "guild_id")
	if err != nil {
		return nil, err
	}

	inviteeID, err := apihelpers.ParseUUID(req.UserId, "INVALID_USER_ID", "user_id")
	if err != nil {
		return nil, err
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
