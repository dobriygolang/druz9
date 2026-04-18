package arena

import (
	"context"
	"errors"
	"fmt"

	arenarating "api/internal/domain/arena/rating"
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
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate arena leaderboard rows: %w", err)
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

func arenaLeague(rating int32) model.ArenaLeague {
	return model.ArenaLeagueFromString(arenarating.LeagueName(rating))
}
