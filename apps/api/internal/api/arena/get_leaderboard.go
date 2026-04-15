package arena

import (
	"context"

	v1 "api/pkg/api/arena/v1"

	"google.golang.org/protobuf/types/known/timestamppb"
)

func (i *Implementation) GetLeaderboard(ctx context.Context, req *v1.GetLeaderboardRequest) (*v1.GetLeaderboardResponse, error) {
	entries, err := i.service.GetLeaderboard(ctx, req.Limit)
	if err != nil {
		return nil, mapErr(err)
	}

	resp := &v1.GetLeaderboardResponse{Entries: mapArenaLeaderboard(entries)}

	// Attach season info (best-effort).
	if season, err := i.service.GetActiveSeason(ctx); err == nil && season != nil {
		resp.Season = &v1.ArenaSeasonInfo{
			SeasonNumber: season.SeasonNumber,
			StartsAt:     timestamppb.New(season.StartsAt),
			EndsAt:       timestamppb.New(season.EndsAt),
		}
	}

	return resp, nil
}
