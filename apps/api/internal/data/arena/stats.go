package arena

import (
	"context"
	"errors"
	"fmt"

	arenarating "api/internal/arena/rating"
	domain "api/internal/domain/arena"
	"api/internal/model"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

func (r *Repo) GetLeaderboard(ctx context.Context, limit int32) ([]*domain.LeaderboardEntry, error) {
	if limit <= 0 {
		limit = 20
	}

	rows, err := r.data.DB.Query(ctx, `
		`+leaderboardSelect+`
		ORDER BY aps.rating DESC, aps.wins DESC, aps.best_runtime_ms ASC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, fmt.Errorf("get arena leaderboard: %w", err)
	}
	defer rows.Close()

	var entries []*domain.LeaderboardEntry
	for rows.Next() {
		var item domain.LeaderboardEntry
		if err := scanLeaderboardEntry(rows, &item); err != nil {
			return nil, fmt.Errorf("scan arena leaderboard: %w", err)
		}
		item.League = arenaLeague(item.Rating)
		copyItem := item
		entries = append(entries, &copyItem)
	}
	return entries, nil
}

func (r *Repo) GetPlayerStats(ctx context.Context, userID uuid.UUID) (*domain.PlayerStats, error) {
	var item domain.PlayerStats
	err := scanPlayerStats(r.data.DB.QueryRow(ctx, leaderboardSelect+`
		WHERE aps.user_id = $1
	`, userID), &item)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get arena player stats: %w", err)
	}
	item.League = arenaLeague(item.Rating)
	return &item, nil
}

func (r *Repo) GetPlayerStatsBatch(ctx context.Context, userIDs []uuid.UUID) (map[uuid.UUID]*domain.PlayerStats, error) {
	if len(userIDs) == 0 {
		return make(map[uuid.UUID]*domain.PlayerStats), nil
	}

	userIDStrings := make([]string, 0, len(userIDs))
	for _, id := range userIDs {
		userIDStrings = append(userIDStrings, id.String())
	}

	rows, err := r.data.DB.Query(ctx, leaderboardSelect+`
		WHERE aps.user_id = ANY($1)
	`, userIDStrings)
	if err != nil {
		return nil, fmt.Errorf("get arena player stats batch: %w", err)
	}
	defer rows.Close()

	result := make(map[uuid.UUID]*domain.PlayerStats, len(userIDs))
	for rows.Next() {
		var item domain.PlayerStats
		if err := scanPlayerStats(rows, &item); err != nil {
			return nil, fmt.Errorf("scan arena player stats batch: %w", err)
		}
		item.League = arenaLeague(item.Rating)
		parsedUserID, err := uuid.Parse(item.UserID)
		if err != nil {
			return nil, fmt.Errorf("parse arena player stats user id %q: %w", item.UserID, err)
		}
		result[parsedUserID] = &item
	}
	return result, nil
}

func arenaLeague(rating int32) model.ArenaLeague {
	return model.ArenaLeagueFromString(arenarating.LeagueName(rating))
}
