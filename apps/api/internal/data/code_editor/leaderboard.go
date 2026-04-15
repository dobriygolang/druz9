package code_editor

import (
	"context"
	"fmt"

	codeeditordomain "api/internal/domain/codeeditor"
	"api/internal/model"
)

func (r *Repo) GetLeaderboard(ctx context.Context, limit int32) ([]*codeeditordomain.LeaderboardEntry, error) {
	if limit <= 0 {
		limit = 20
	}

	rows, err := r.data.DB.Query(ctx, `
		WITH duel_rooms AS (
			SELECT id, winner_user_id, winner_guest_name
			FROM code_rooms
			WHERE mode = $1 AND status = $2
		),
		match_participants AS (
			SELECT
				cp.room_id,
				COALESCE(cp.user_id::text, 'guest:' || cp.name) AS actor_id,
				COALESCE(NULLIF(cp.name, ''), 'Гость') AS display_name,
				CASE
					WHEN cp.user_id IS NOT NULL AND cp.user_id = dr.winner_user_id THEN 1
					WHEN cp.user_id IS NULL AND cp.name = dr.winner_guest_name THEN 1
					ELSE 0
				END AS is_win
			FROM code_participants cp
			JOIN duel_rooms dr ON dr.id = cp.room_id
		),
		best_times AS (
			SELECT
				COALESCE(user_id::text, 'guest:' || guest_name) AS actor_id,
				MIN(duration_ms) FILTER (WHERE is_correct = TRUE) AS best_solve_ms
			FROM code_submissions
			GROUP BY 1
		)
		SELECT
			mp.actor_id,
			mp.display_name,
			SUM(mp.is_win)::int AS wins,
			COUNT(*)::int AS matches,
			CASE WHEN COUNT(*) = 0 THEN 0 ELSE SUM(mp.is_win)::float8 / COUNT(*)::float8 END AS win_rate,
			COALESCE(bt.best_solve_ms, 0)::bigint AS best_solve_ms
		FROM match_participants mp
		LEFT JOIN best_times bt ON bt.actor_id = mp.actor_id
		GROUP BY mp.actor_id, mp.display_name, bt.best_solve_ms
		ORDER BY wins DESC, win_rate DESC, best_solve_ms ASC
		LIMIT $3
	`, model.RoomModeDuel, model.RoomStatusFinished, limit)
	if err != nil {
		return nil, fmt.Errorf("get leaderboard: %w", err)
	}
	defer rows.Close()

	var entries []*codeeditordomain.LeaderboardEntry
	for rows.Next() {
		var entry codeeditordomain.LeaderboardEntry
		if err := rows.Scan(&entry.UserID, &entry.DisplayName, &entry.Wins, &entry.Matches, &entry.WinRate, &entry.BestSolveMs); err != nil {
			return nil, fmt.Errorf("scan leaderboard: %w", err)
		}
		entries = append(entries, &entry)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate leaderboard rows: %w", err)
	}
	return entries, nil
}
