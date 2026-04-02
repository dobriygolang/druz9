package profile

import (
	"context"

	"api/internal/storage/postgres"

	"github.com/go-kratos/kratos/v2/log"
)

type Repo struct {
	data           *postgres.Store
	hasTrustedFlag bool
}

func NewRepo(dataLayer *postgres.Store, _ log.Logger) *Repo {
	repo := &Repo{
		data:           dataLayer,
		hasTrustedFlag: false,
	}

	if dataLayer != nil && dataLayer.DB != nil {
		if _, err := dataLayer.DB.Exec(context.Background(), `
			ALTER TABLE users
			ADD COLUMN IF NOT EXISTS is_trusted BOOLEAN NOT NULL DEFAULT FALSE
		`); err == nil {
			repo.hasTrustedFlag = true
		}
	}

	return repo
}

type userScanner interface {
	Scan(dest ...any) error
}

func (r *Repo) trustedSelect(columnRef string) string {
	if r != nil && r.hasTrustedFlag {
		return columnRef
	}
	return "FALSE AS is_trusted"
}
