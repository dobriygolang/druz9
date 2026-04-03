package profile

import (
	"api/internal/storage/postgres"

	"github.com/go-kratos/kratos/v2/log"
)

type Repo struct {
	data *postgres.Store
}

func NewRepo(dataLayer *postgres.Store, _ log.Logger) *Repo {
	return &Repo{data: dataLayer}
}

type userScanner interface {
	Scan(dest ...any) error
}
