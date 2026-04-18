package arena

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"

	arenarating "api/internal/domain/arena/rating"
	"api/internal/model"
)

func (r *Repo) GetActiveSeason(ctx context.Context) (*model.ArenaSeason, error) {
	var s model.ArenaSeason
	err := r.data.DB.QueryRow(ctx, `
		SELECT season_number, starts_at, ends_at, is_active
		FROM arena_seasons
		WHERE is_active = TRUE
		ORDER BY season_number DESC
		LIMIT 1
	`).Scan(&s.SeasonNumber, &s.StartsAt, &s.EndsAt, &s.IsActive)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get active season: %w", err)
	}
	return &s, nil
}

func (r *Repo) GetLeaguePosition(ctx context.Context, userID string, rating int32) (rank, total int32, err error) {
	leagueName := arenarating.LeagueName(rating)
	league := leagueByName(leagueName)
	minRating := league.MinRating
	maxRating := int32(99999)

	idx := arenarating.LeagueIndex(rating)
	if idx < len(arenarating.Leagues)-1 {
		maxRating = arenarating.Leagues[idx+1].MinRating - 1
	}

	err = r.data.DB.QueryRow(ctx, `
		SELECT COUNT(*) FROM arena_player_stats
		WHERE rating >= $1 AND rating <= $2 AND rating > $3
	`, minRating, maxRating, rating).Scan(&rank)
	if err != nil {
		return 0, 0, fmt.Errorf("get league rank: %w", err)
	}
	rank++ // 1-based, player is after everyone with higher rating

	err = r.data.DB.QueryRow(ctx, `
		SELECT COUNT(*) FROM arena_player_stats
		WHERE rating >= $1 AND rating <= $2
	`, minRating, maxRating).Scan(&total)
	if err != nil {
		return 0, 0, fmt.Errorf("get league total: %w", err)
	}

	return rank, total, nil
}

func leagueByName(name string) arenarating.League {
	for _, l := range arenarating.Leagues {
		if l.Name == name {
			return l
		}
	}
	return arenarating.Leagues[0]
}

func (r *Repo) RunSeasonReset(ctx context.Context, endingSeason int32, newSeason *model.ArenaSeason) error {
	tx, err := r.data.DB.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin season reset tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	// 1. Snapshot current stats into season_results.
	if _, err := tx.Exec(ctx, `
		INSERT INTO arena_season_results (user_id, season_number, final_rating, final_league, peak_rating, wins, losses, matches, started_at, ended_at)
		SELECT
			aps.user_id,
			$1,
			aps.rating,
			'',
			aps.peak_rating,
			aps.wins,
			aps.losses,
			aps.matches,
			s.starts_at,
			s.ends_at
		FROM arena_player_stats aps
		CROSS JOIN arena_seasons s
		WHERE s.season_number = $1
		  AND aps.matches > 0
		ON CONFLICT (user_id, season_number) DO NOTHING
	`, endingSeason); err != nil {
		return fmt.Errorf("snapshot season results: %w", err)
	}

	// 2. Update final_league based on final_rating.
	for _, league := range arenarating.Leagues {
		if _, err := tx.Exec(ctx, `
			UPDATE arena_season_results
			SET final_league = $1
			WHERE season_number = $2
			  AND final_rating >= $3
		`, league.Name, endingSeason, league.MinRating); err != nil {
			return fmt.Errorf("set season league %s: %w", league.Name, err)
		}
	}

	// 3. Compute league ranks within the ending season.
	if _, err := tx.Exec(ctx, `
		UPDATE arena_season_results sr
		SET league_rank = sub.rn
		FROM (
			SELECT user_id,
			       ROW_NUMBER() OVER (PARTITION BY final_league ORDER BY final_rating DESC, wins DESC) AS rn
			FROM arena_season_results
			WHERE season_number = $1
		) sub
		WHERE sr.user_id = sub.user_id AND sr.season_number = $1
	`, endingSeason); err != nil {
		return fmt.Errorf("compute league ranks: %w", err)
	}

	// 4. Soft-reset all player stats.
	defaultRating := arenarating.DefaultRating
	if _, err := tx.Exec(ctx, `
		UPDATE arena_player_stats
		SET rating = GREATEST(FLOOR(rating * 0.75 + $1 * 0.25)::int, $2),
		    wins = 0,
		    losses = 0,
		    matches = 0,
		    current_win_streak = 0,
		    season_number = $3,
		    updated_at = NOW()
	`, defaultRating, arenarating.MinimumRating, newSeason.SeasonNumber); err != nil {
		return fmt.Errorf("soft reset stats: %w", err)
	}
	// Note: peak_rating is NOT reset — it's an all-time high.

	// 5. Deactivate old season, insert new season.
	if _, err := tx.Exec(ctx, `
		UPDATE arena_seasons SET is_active = FALSE WHERE season_number = $1
	`, endingSeason); err != nil {
		return fmt.Errorf("deactivate old season: %w", err)
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO arena_seasons (season_number, starts_at, ends_at, is_active)
		VALUES ($1, $2, $3, TRUE)
		ON CONFLICT (season_number) DO UPDATE SET
		  starts_at = EXCLUDED.starts_at,
		  ends_at = EXCLUDED.ends_at,
		  is_active = TRUE
	`, newSeason.SeasonNumber, newSeason.StartsAt, newSeason.EndsAt); err != nil {
		return fmt.Errorf("create new season: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit season reset: %w", err)
	}
	return nil
}
