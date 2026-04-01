package seeds

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
)

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
