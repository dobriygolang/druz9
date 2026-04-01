package seeds

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"time"
)

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
