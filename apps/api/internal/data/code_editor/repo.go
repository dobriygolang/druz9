package code_editor

import (
	"api/internal/storage/postgres"

	codeeditordomain "api/internal/domain/codeeditor"

	"github.com/go-kratos/kratos/v2/log"
)

const roomColumns = `
	id, mode, code, code_revision, status, creator_id, invite_code,
	COALESCE(task, ''), task_id, COALESCE(duel_topic, ''),
	winner_user_id, COALESCE(winner_guest_name, ''), started_at, finished_at, created_at, updated_at
`

type scanner interface {
	Scan(dest ...any) error
}

type Repo struct {
	data *postgres.Store
}

func NewRepo(dataLayer *postgres.Store, _ log.Logger) codeeditordomain.Repository {
	return &Repo{
		data: dataLayer,
	}
}
