package interviewprep

import (
	"context"

	"github.com/go-kratos/kratos/v2/log"
	"github.com/google/uuid"

	codetasksrepo "api/internal/data/codetasks"
	"api/internal/model"
	"api/internal/storage/postgres"
)

type Repo struct {
	data *postgres.Store
}

func New(dataLayer *postgres.Store, _ log.Logger) *Repo {
	return &Repo{
		data: dataLayer,
	}
}

type scanner interface {
	Scan(dest ...any) error
}

func (r *Repo) GetCodeTask(ctx context.Context, taskID uuid.UUID) (*model.CodeTask, error) {
	row := r.data.DB.QueryRow(ctx, `
		SELECT `+codetasksrepo.SelectColumns+`
		FROM code_tasks
		WHERE id = $1
	`, taskID)

	var task model.CodeTask
	if err := codetasksrepo.ScanTask(row, &task); err != nil {
		return nil, err
	}
	if err := codetasksrepo.LoadCases(ctx, r.data.DB, &task); err != nil {
		return nil, err
	}
	return &task, nil
}
