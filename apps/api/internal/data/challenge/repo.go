package challenge

import (
	"github.com/go-kratos/kratos/v2/log"

	"api/internal/storage/postgres"
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
