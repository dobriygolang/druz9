package guild

import (
	"context"
	"fmt"

	"google.golang.org/protobuf/types/known/timestamppb"

	"api/internal/apihelpers"
	v1 "api/pkg/api/guild/v1"
)

func (i *Implementation) GetGuildMemberStats(ctx context.Context, req *v1.GetGuildMemberStatsRequest) (*v1.GetGuildMemberStatsResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}

	guildID, err := apihelpers.ParseUUID(req.GetGuildId(), "INVALID_GUILD_ID", "guild_id")
	if err != nil {
		return nil, fmt.Errorf("parse guild id: %w", err)
	}

	stats, err := i.service.GetMemberStats(ctx, guildID, user.ID)
	if err != nil {
		return nil, fmt.Errorf("get member stats: %w", err)
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
