package seeds

import (
	"context"
	"time"

	appcodeeditor "api/internal/app/codeeditor"

	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	seedKindSQL     = "sql"
	seedKindCatalog = "catalog"
)

type Result struct {
	Name      string
	Kind      string
	Applied   bool
	Message   string
	AppliedAt time.Time
}

type Record struct {
	Name      string
	Kind      string
	Checksum  string
	AppliedAt time.Time
}

type Options struct {
	RunSQL     bool
	RunBlind75 bool
}

type Runner struct {
	db         *pgxpool.Pool
	codeEditor *appcodeeditor.Service
	sqlDir     string
}

func NewRunner(db *pgxpool.Pool, codeEditor *appcodeeditor.Service, sqlDir string) *Runner {
	return &Runner{
		db:         db,
		codeEditor: codeEditor,
		sqlDir:     sqlDir,
	}
}

func (r *Runner) Run(ctx context.Context, opts Options) ([]Result, error) {
	var results []Result
	if opts.RunSQL {
		sqlResults, err := r.runSQLSeeds(ctx)
		if err != nil {
			return nil, err
		}
		results = append(results, sqlResults...)
	}
	if opts.RunBlind75 {
		blindResult, err := r.runBlind75(ctx)
		if err != nil {
			return nil, err
		}
		results = append(results, blindResult)
	}
	return results, nil
}
