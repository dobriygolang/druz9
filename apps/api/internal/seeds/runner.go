package seeds

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"time"

	appcodeeditor "api/internal/app/codeeditor"

	"github.com/jackc/pgx/v5"
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
	RunSQL           bool
	RunBlind75       bool
	RunInterviewPrep bool
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
	if opts.RunInterviewPrep {
		interviewPrepResult, err := r.runInterviewPrep(ctx)
		if err != nil {
			return nil, err
		}
		results = append(results, interviewPrepResult)
	}
	return results, nil
}

func (r *Runner) List(ctx context.Context) ([]Record, error) {
	rows, err := r.db.Query(ctx, `
		SELECT name, kind, checksum, applied_at
		FROM seed_runs
		ORDER BY applied_at ASC, name ASC
	`)
	if err != nil {
		return nil, fmt.Errorf("list seed runs: %w", err)
	}
	defer rows.Close()

	var records []Record
	for rows.Next() {
		var record Record
		if err := rows.Scan(&record.Name, &record.Kind, &record.Checksum, &record.AppliedAt); err != nil {
			return nil, fmt.Errorf("scan seed run: %w", err)
		}
		records = append(records, record)
	}
	return records, nil
}

func (r *Runner) runSQLSeeds(ctx context.Context) ([]Result, error) {
	entries, err := os.ReadDir(r.sqlDir)
	if err != nil {
		return nil, fmt.Errorf("read sql seeds dir: %w", err)
	}

	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Name() < entries[j].Name()
	})

	var results []Result
	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != ".sql" {
			continue
		}
		fullPath := filepath.Join(r.sqlDir, entry.Name())
		content, err := os.ReadFile(fullPath)
		if err != nil {
			return nil, fmt.Errorf("read sql seed %s: %w", entry.Name(), err)
		}

		name := entry.Name()
		checksum := digest(content)
		applied, appliedAt, err := r.shouldApply(ctx, name, seedKindSQL, checksum)
		if err != nil {
			return nil, err
		}
		if !applied {
			results = append(results, Result{
				Name:      name,
				Kind:      seedKindSQL,
				Applied:   false,
				Message:   "already applied",
				AppliedAt: appliedAt,
			})
			continue
		}

		if _, err := r.db.Exec(ctx, string(content)); err != nil {
			return nil, fmt.Errorf("apply sql seed %s: %w", name, err)
		}
		appliedAt = time.Now().UTC()
		if err := r.record(ctx, name, seedKindSQL, checksum, appliedAt); err != nil {
			return nil, err
		}
		results = append(results, Result{
			Name:      name,
			Kind:      seedKindSQL,
			Applied:   true,
			Message:   "applied",
			AppliedAt: appliedAt,
		})
	}

	return results, nil
}

func (r *Runner) shouldApply(ctx context.Context, name string, kind string, checksum string) (bool, time.Time, error) {
	var record Record
	err := r.db.QueryRow(ctx, `
		SELECT name, kind, checksum, applied_at
		FROM seed_runs
		WHERE name = $1
	`, name).Scan(&record.Name, &record.Kind, &record.Checksum, &record.AppliedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return true, time.Time{}, nil
		}
		return false, time.Time{}, fmt.Errorf("load seed record %s: %w", name, err)
	}

	if record.Kind == kind && record.Checksum == checksum {
		return false, record.AppliedAt, nil
	}

	return true, record.AppliedAt, nil
}

func (r *Runner) record(ctx context.Context, name string, kind string, checksum string, appliedAt time.Time) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO seed_runs (name, kind, checksum, applied_at)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (name) DO UPDATE
		SET kind = EXCLUDED.kind,
		    checksum = EXCLUDED.checksum,
		    applied_at = EXCLUDED.applied_at
	`, name, kind, checksum, appliedAt)
	if err != nil {
		return fmt.Errorf("record seed %s: %w", name, err)
	}
	return nil
}

func digest(content []byte) string {
	sum := sha256.Sum256(content)
	return hex.EncodeToString(sum[:])
}
