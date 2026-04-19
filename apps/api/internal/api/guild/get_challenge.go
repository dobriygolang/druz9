package guild

import (
	"context"
	"fmt"

	"api/internal/apihelpers"
	v1 "api/pkg/api/guild/v1"
)

func (i *Implementation) GetActiveGuildChallenge(ctx context.Context, req *v1.GetActiveGuildChallengeRequest) (*v1.GetActiveGuildChallengeResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}

	guildID, err := apihelpers.ParseUUID(req.GetGuildId(), "INVALID_GUILD_ID", "guild_id")
	if err != nil {
		return nil, fmt.Errorf("parse guild_id: %w", err)
	}

	challenge, err := i.service.GetActiveChallenge(ctx, guildID, user.ID)
	if err != nil {
		return nil, fmt.Errorf("get active challenge: %w", err)
	}

	return &v1.GetActiveGuildChallengeResponse{
		Challenge: mapChallenge(challenge),
	}, nil
}
