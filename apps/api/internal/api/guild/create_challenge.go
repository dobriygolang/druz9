package guild

import (
	"context"

	"api/internal/apihelpers"
	"api/internal/notiftext"
	v1 "api/pkg/api/guild/v1"

	klog "github.com/go-kratos/kratos/v2/log"
)

func (i *Implementation) CreateGuildChallenge(ctx context.Context, req *v1.CreateGuildChallengeRequest) (*v1.CreateGuildChallengeResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}

	guildID, err := apihelpers.ParseUUID(req.GuildId, "INVALID_GUILD_ID", "guild_id")
	if err != nil {
		return nil, err
	}

	challenge, err := i.service.CreateChallenge(ctx, guildID, user.ID, req.TemplateKey, req.TargetValue)
	if err != nil {
		return nil, err
	}

	// Notify: guild_event_created — notify all guild members about the new challenge.
	if i.notif != nil {
		go func() {
			members, mErr := i.service.ListGuildMembers(ctx, guildID, 200)
			if mErr != nil {
				klog.Errorf("create challenge notify: list members guild=%s: %v", guildID, mErr)
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
				notiftext.ChallengeCreatedBody(req.TemplateKey, req.TargetValue),
				map[string]any{"guild_id": guildID.String(), "challenge_id": challenge.ID.String(), "template_key": req.TemplateKey, "target_value": req.TargetValue})
		}()
	}

	return &v1.CreateGuildChallengeResponse{
		Challenge: mapChallenge(challenge),
	}, nil
}
