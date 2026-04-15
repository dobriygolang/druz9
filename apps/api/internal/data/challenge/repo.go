package challenge

import (
	"api/internal/storage/postgres"

	"github.com/go-kratos/kratos/v2/log"
)

// Repo handles all challenge-related data operations.
type Repo struct {
	data *postgres.Store
	log  *log.Helper
}

// NewRepo creates a new challenge repository.
func NewRepo(dataLayer *postgres.Store, logger log.Logger) *Repo {
	return &Repo{
		data: dataLayer,
		log:  log.NewHelper(logger),
	}
}
