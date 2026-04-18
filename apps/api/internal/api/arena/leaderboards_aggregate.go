package arena

import (
	"context"

	"github.com/go-kratos/kratos/v2/errors"
	klog "github.com/go-kratos/kratos/v2/log"

	"api/internal/model"
	v1 "api/pkg/api/arena/v1"
)

// Pure protobuf-mapping handlers for the guild + season-XP leaderboards.
// The SQL and aggregation logic used to live right here as a
// `leaderboardAggregator` holding a *pgxpool.Pool — an architecture leak
// that meant the transport layer knew about the database. It now sits
// in data/arena/leaderboards.go and is exposed via the arena service.

func (i *Implementation) GuildsLeaderboard(ctx context.Context, req *v1.GuildsLeaderboardRequest) (*v1.GuildsLeaderboardResponse, error) {
	entries, err := i.service.GetGuildLeaderboard(ctx, req.GetLimit())
	if err != nil {
		klog.Errorf("arena: guild leaderboard: %v", err)
		return nil, errors.InternalServer("INTERNAL", "failed to load guild leaderboard")
	}
	out := make([]*v1.GuildLeaderboardEntry, 0, len(entries))
	for _, e := range entries {
		out = append(out, guildLeaderboardEntryToProto(e))
	}
	return &v1.GuildsLeaderboardResponse{Entries: out}, nil
}

func (i *Implementation) SeasonXPLeaderboard(ctx context.Context, req *v1.SeasonXPLeaderboardRequest) (*v1.SeasonXPLeaderboardResponse, error) {
	entries, season, err := i.service.GetSeasonXPLeaderboard(ctx, req.GetLimit())
	if err != nil {
		klog.Errorf("arena: season xp leaderboard: %v", err)
		return nil, errors.InternalServer("INTERNAL", "failed to load season XP leaderboard")
	}
	out := make([]*v1.SeasonXPEntry, 0, len(entries))
	for _, e := range entries {
		out = append(out, seasonXPEntryToProto(e))
	}
	return &v1.SeasonXPLeaderboardResponse{Entries: out, SeasonNumber: season}, nil
}

func guildLeaderboardEntryToProto(e *model.GuildLeaderboardEntry) *v1.GuildLeaderboardEntry {
	return &v1.GuildLeaderboardEntry{
		GuildId:         e.GuildID,
		Name:            e.Name,
		MemberCount:     e.MemberCount,
		TotalWins:       e.TotalWins,
		AggregatePoints: e.AggregatePoints,
		AvgRating:       e.AvgRating,
		DeltaWeek:       e.DeltaWeek,
	}
}

func seasonXPEntryToProto(e *model.SeasonXPEntry) *v1.SeasonXPEntry {
	return &v1.SeasonXPEntry{
		UserId:      e.UserID,
		Username:    e.Username,
		DisplayName: e.DisplayName,
		AvatarUrl:   e.AvatarURL,
		GuildName:   e.GuildName,
		Xp:          e.XP,
		CurrentTier: e.CurrentTier,
		Trophies:    e.Trophies,
	}
}
