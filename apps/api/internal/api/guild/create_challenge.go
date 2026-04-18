package guild

import (
	"context"
	"fmt"

	klog "github.com/go-kratos/kratos/v2/log"

	"api/internal/apihelpers"
	"api/internal/clients/notification/notiftext"
	v1 "api/pkg/api/guild/v1"
)

func (i *Implementation) CreateGuildChallenge(ctx context.Context, req *v1.CreateGuildChallengeRequest) (*v1.CreateGuildChallengeResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}

	guildID, err := apihelpers.ParseUUID(req.GetGuildId(), "INVALID_GUILD_ID", "guild_id")
	if err != nil {
		return nil, err
	}

	challenge, err := i.service.CreateChallenge(ctx, guildID, user.ID, req.GetTemplateKey(), req.GetTargetValue())
	if err != nil {
		return nil, fmt.Errorf("create guild challenge: %w", err)
	}

	// Notify: guild_event_created — notify all guild members about the new challenge.
	if i.notif != nil {
		go func() {
			members, mErr := i.service.ListGuildMembers(ctx, guildID, 200)
			if mErr != nil {
				klog.Errorf("create challenge notify: list members guild=%s: %v", guildID, fmt.Errorf("list guild members: %w", mErr))
				return
			}
			userIDs := make([]string, 0, len(members))
			for _, m := range members {
				if m.UserID != user.ID {
					userIDs = append(userIDs, m.UserID.String())
				}
			}
			if len(userIDs) == 0 {
				return
			}
			i.notif.SendBatch(ctx, userIDs, "guild_event_created",
				notiftext.ChallengeCreatedTitle(),
				notiftext.ChallengeCreatedBody(req.GetTemplateKey(), req.GetTargetValue()),
				map[string]any{"guild_id": guildID.String(), "challenge_id": challenge.ID.String(), "template_key": req.GetTemplateKey(), "target_value": req.GetTargetValue()})
		}()
	}

	return &v1.CreateGuildChallengeResponse{
		Challenge: mapChallenge(challenge),
	}, nil
}
