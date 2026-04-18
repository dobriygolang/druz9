package guild

import (
	"context"

	"api/internal/model"
	v1 "api/pkg/api/guild/v1"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
	"google.golang.org/protobuf/types/known/timestamppb"
)

func (i *Implementation) GetGuildMemberStats(ctx context.Context, req *v1.GetGuildMemberStatsRequest) (*v1.GetGuildMemberStatsResponse, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok {
		return nil, errors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}

	guildID, err := uuid.Parse(req.GuildId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_GUILD_ID", "invalid guild_id")
	}

	stats, err := i.service.GetMemberStats(ctx, guildID, user.ID)
	if err != nil {
		return nil, err
	}

	out := make([]*v1.GuildMemberStatsEntry, 0, len(stats))
	for _, s := range stats {
		out = append(out, &v1.GuildMemberStatsEntry{
			UserId:      s.UserID.String(),
			FirstName:   s.FirstName,
			LastName:    s.LastName,
			AvatarUrl:   s.AvatarURL,
			Role:        mapGuildMemberRole(s.Role),
			JoinedAt:    timestamppb.New(s.JoinedAt),
			DailySolved: s.DailySolved,
			DuelsWon:    s.DuelsWon,
			DuelsPlayed: s.DuelsPlayed,
			MocksDone:   s.MocksDone,
			ArenaRating: s.ArenaRating,
			ArenaLeague: s.ArenaLeague,
		})
	}

	return &v1.GetGuildMemberStatsResponse{Members: out}, nil
}
