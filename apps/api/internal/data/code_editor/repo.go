package code_editor

import (
	"github.com/go-kratos/kratos/v2/log"

	"api/internal/storage/postgres"
)

// roomFullQuery returns room + all participants in a single query using JSON_AGG.
// Callers must append WHERE and GROUP BY cr.id, ct.id.
const roomFullQuery = `
SELECT
	cr.id, cr.mode, cr.code, cr.code_revision, cr.status, cr.creator_id, cr.invite_code,
	cr.language, COALESCE(NULLIF(cr.task, ''), ct.title, ''), cr.task_id, COALESCE(cr.duel_topic, ''),
	cr.winner_user_id, COALESCE(cr.winner_guest_name, ''), cr.started_at, cr.finished_at, cr.created_at, cr.updated_at,
	COALESCE(cr.is_private, FALSE),
	COALESCE(
		JSON_AGG(
			JSON_BUILD_OBJECT(
				'user_id', cp.user_id::text,
				'name',     cp.name,
				'is_guest', cp.is_guest,
				'is_ready', cp.is_ready,
				'is_winner',cp.is_winner,
				'joined_at',cp.joined_at
			) ORDER BY cp.joined_at
		) FILTER (WHERE cp.id IS NOT NULL),
		'[]'::json
	)
FROM code_rooms cr
LEFT JOIN code_tasks        ct ON ct.id = cr.task_id
LEFT JOIN code_participants cp ON cp.room_id = cr.id
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
