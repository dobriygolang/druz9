package arena

import (
	"context"
	"fmt"

	"api/internal/model"
)

// ListGuildLeaderboard ranks guilds by aggregate arena wins and
// member-average rating. Extracted from the old api/arena aggregator so
// the api layer stays handler-only.
//
// The `guild_wins` CTE joins guild_members → arena_match_players →
// arena_matches filtering on `status = 3` (finished). The 7-day
// `wins_week` window produces the movement delta column. Partial index
// idx_arena_matches_winner_finished (migration 00039) covers this path.
func (r *Repo) ListGuildLeaderboard(ctx context.Context, limit int32) ([]*model.GuildLeaderboardEntry, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	rows, err := r.data.DB.Query(ctx, `
        WITH guild_wins AS (
            SELECT gm.guild_id,
                   COUNT(*) FILTER (WHERE am.winner_user_id = gm.user_id) AS wins,
                   COUNT(*) FILTER (WHERE am.winner_user_id = gm.user_id
                                     AND am.finished_at >= NOW() - INTERVAL '7 days') AS wins_week
            FROM guild_members gm
            JOIN arena_match_players amp ON amp.user_id = gm.user_id
            JOIN arena_matches am ON am.id = amp.match_id
            WHERE am.status = 3
            GROUP BY gm.guild_id
        ),
        guild_ratings AS (
            SELECT gm.guild_id,
                   AVG(apr.rating)::INT AS avg_rating
            FROM guild_members gm
            LEFT JOIN arena_player_ratings apr ON apr.user_id = gm.user_id
            GROUP BY gm.guild_id
        )
        SELECT g.id, g.name,
               COALESCE(g.member_count, 0) AS member_count,
               COALESCE(gw.wins, 0),
               COALESCE(gw.wins, 0) * 100 AS points,
               COALESCE(gr.avg_rating, 0),
               COALESCE(gw.wins_week, 0)
        FROM guilds g
        LEFT JOIN guild_wins    gw ON gw.guild_id = g.id
        LEFT JOIN guild_ratings gr ON gr.guild_id = g.id
        ORDER BY points DESC, member_count DESC
        LIMIT $1
    `, limit)
	if err != nil {
		return nil, fmt.Errorf("guilds leaderboard: %w", err)
	}
	defer rows.Close()

	out := make([]*model.GuildLeaderboardEntry, 0, limit)
	for rows.Next() {
		e := &model.GuildLeaderboardEntry{}
		if err := rows.Scan(&e.GuildID, &e.Name, &e.MemberCount, &e.TotalWins, &e.AggregatePoints, &e.AvgRating, &e.DeltaWeek); err != nil {
			return nil, fmt.Errorf("scan guild leaderboard row: %w", err)
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

// ListSeasonXPLeaderboard ranks users by their current season-pass XP
// and also returns the active season number (0 if no season is live).
// Clamps limit to [1, 200]. Uses idx_uspp_season_xp (migration 00039)
// so the ORDER BY is satisfied by an index range scan.
func (r *Repo) ListSeasonXPLeaderboard(ctx context.Context, limit int32) ([]*model.SeasonXPEntry, int32, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 200 {
		limit = 200
	}

	var seasonNumber int32
	_ = r.data.DB.QueryRow(ctx, `
        SELECT season_number FROM season_passes
        WHERE starts_at <= NOW() AND ends_at > NOW()
        ORDER BY starts_at DESC LIMIT 1
    `).Scan(&seasonNumber)

	rows, err := r.data.DB.Query(ctx, `
        SELECT u.id,
               COALESCE(u.username, ''),
               TRIM(CONCAT_WS(' ', u.first_name, u.last_name)) AS display_name,
               -- users has yandex_avatar_url + telegram_avatar_url, not a
               -- single avatar_url. Coalesce in preference order.
               COALESCE(NULLIF(u.yandex_avatar_url, ''), NULLIF(u.telegram_avatar_url, ''), ''),
               COALESCE(g.name, '') AS guild_name,
               COALESCE(usp.xp, 0) AS xp,
               COALESCE((COALESCE(usp.xp, 0) / NULLIF(sp.xp_per_tier, 0))::INT, 0) AS current_tier,
               0 AS trophies
        FROM user_season_pass_progress usp
        JOIN season_passes sp ON sp.id = usp.season_pass_id AND sp.starts_at <= NOW() AND sp.ends_at > NOW()
        JOIN users u ON u.id = usp.user_id
        LEFT JOIN guild_members gm ON gm.user_id = u.id
        LEFT JOIN guilds g ON g.id = gm.guild_id
        ORDER BY xp DESC
        LIMIT $1
    `, limit)
	if err != nil {
		return nil, 0, fmt.Errorf("season xp leaderboard: %w", err)
	}
	defer rows.Close()

	out := make([]*model.SeasonXPEntry, 0, limit)
	for rows.Next() {
		e := &model.SeasonXPEntry{}
		if err := rows.Scan(&e.UserID, &e.Username, &e.DisplayName, &e.AvatarURL, &e.GuildName, &e.XP, &e.CurrentTier, &e.Trophies); err != nil {
			return nil, 0, fmt.Errorf("scan season xp row: %w", err)
		}
		out = append(out, e)
	}
	return out, seasonNumber, rows.Err()
}
