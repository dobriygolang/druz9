package guild

import (
	"context"

	"api/internal/model"
	v1 "api/pkg/api/guild/v1"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

func (i *Implementation) GetActiveGuildChallenge(ctx context.Context, req *v1.GetActiveGuildChallengeRequest) (*v1.GetActiveGuildChallengeResponse, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok {
		return nil, errors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}

	guildID, err := uuid.Parse(req.GuildId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_GUILD_ID", "invalid guild_id")
	}

	challenge, err := i.service.GetActiveChallenge(ctx, guildID, user.ID)
	if err != nil {
		return nil, err
	}

	return &v1.GetActiveGuildChallengeResponse{
		Challenge: mapChallenge(challenge),
	}, nil
}
