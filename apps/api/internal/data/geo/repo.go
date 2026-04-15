package geo

import "api/internal/storage/postgres"

type Repo struct {
	data *postgres.Store
}

func NewRepo(data *postgres.Store) *Repo {
	return &Repo{data: data}
}
