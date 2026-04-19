package arena

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"api/internal/apihelpers"
	"api/internal/model"
	v1 "api/pkg/api/arena/v1"
)

func (i *Implementation) GetPlayerStats(ctx context.Context, req *v1.GetPlayerStatsRequest) (*v1.ArenaPlayerStatsResponse, error) {
	var targetID uuid.UUID

	if req.GetUserId() != "" {
		id, err := apihelpers.ParseUUID(req.GetUserId(), "INVALID_USER_ID", "invalid user id")
		if err != nil {
			return nil, fmt.Errorf("parse user uuid: %w", err)
		}
		targetID = id
	} else {
		user, err := resolveArenaActor(ctx, true)
		if err != nil {
			return nil, err
		}
		targetID = user.ID
	}

	stats, err := i.service.GetPlayerStats(ctx, targetID)
	if err != nil {
		return nil, mapErr(err)
	}

	return &v1.ArenaPlayerStatsResponse{Stats: mapArenaPlayerStats(stats)}, nil
}

func mapArenaPlayerStats(s *model.ArenaPlayerStats) *v1.ArenaPlayerStats {
	if s == nil {
		return nil
	}
	return &v1.ArenaPlayerStats{
		UserId:           s.UserID,
		DisplayName:      s.DisplayName,
		Rating:           s.Rating,
		League:           mapArenaLeague(s.League),
		Wins:             s.Wins,
		Losses:           s.Losses,
		Matches:          s.Matches,
		WinRate:          s.WinRate,
		BestRuntime:      s.BestRuntime,
		PeakRating:       s.PeakRating,
		CurrentWinStreak: s.CurrentWinStreak,
		BestWinStreak:    s.BestWinStreak,
	}
}
