package code_editor

import (
	"api/internal/storage/postgres"

	"github.com/go-kratos/kratos/v2/log"
)

const roomSelectColumns = `
	cr.id, cr.mode, cr.code, cr.code_revision, cr.status, cr.creator_id, cr.invite_code,
	COALESCE(ct.statement, ''), cr.task_id, COALESCE(cr.duel_topic, ''),
	cr.winner_user_id, COALESCE(cr.winner_guest_name, ''), cr.started_at, cr.finished_at, cr.created_at, cr.updated_at
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
