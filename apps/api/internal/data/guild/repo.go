package guild

import (
	"github.com/go-kratos/kratos/v2/log"

	"api/internal/storage/postgres"
)

type Repo struct {
	data *postgres.Store
	log  *log.Helper
}

func NewRepo(dataLayer *postgres.Store, logger log.Logger) *Repo {
	return &Repo{
		data: dataLayer,
		log:  log.NewHelper(logger),
	}
}
