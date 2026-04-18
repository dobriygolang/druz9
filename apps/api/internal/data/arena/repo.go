package arena

import (
	"github.com/go-kratos/kratos/v2/log"

	"api/internal/storage/postgres"
)

const leaderboardSelect = `
	SELECT
		aps.user_id::text,
		COALESCE(NULLIF(trim(concat_ws(' ', u.first_name, u.last_name)), ''), NULLIF(u.username, ''), aps.display_name),
		aps.rating,
		aps.wins,
		aps.losses,
		aps.matches,
		CASE WHEN aps.matches = 0 THEN 0 ELSE aps.wins::float8 / aps.matches::float8 END AS win_rate,
		COALESCE(aps.best_runtime_ms, 0)::bigint,
		aps.peak_rating,
		aps.current_win_streak,
		aps.best_win_streak
	FROM arena_player_stats aps
	LEFT JOIN users u ON u.id = aps.user_id
`

type scanner interface {
	Scan(dest ...any) error
}

type Repo struct {
	data *postgres.Store
}

func NewRepo(dataLayer *postgres.Store, _ log.Logger) *Repo {
	return &Repo{
		data: dataLayer,
	}
}
