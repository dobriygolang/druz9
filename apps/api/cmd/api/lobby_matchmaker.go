package main

import (
	"context"
	"fmt"
	"time"

	klog "github.com/go-kratos/kratos/v2/log"

	"api/internal/storage/postgres"
)

// startLobbyMatchmakerWorker pairs queued team_2v2 lobbies (ADR-004).
// Runs every 10s. The current implementation just flips the matched
// status on consecutive pairs — the full match-creation handoff to
// arena.Service.CreateMatch lands when the matchmaker grows team_2v2
// support. Until then this gives the frontend a way to observe
// "we got matched, redirect to lobby/match" via the lobby status field.
func startLobbyMatchmakerWorker(store *postgres.Store) func() error {
	ctx, cancel := context.WithCancel(context.Background())

	go func() {
		ticker := time.NewTicker(10 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				if matched, err := pairQueuedLobbies(context.Background(), store); err != nil {
					klog.Warnf("lobby matchmaker: %v", err)
				} else if matched > 0 {
					klog.Infof("lobby matchmaker: paired %d lobbies", matched)
				}
			}
		}
	}()

	return func() error {
		cancel()
		return nil
	}
}

// pairQueuedLobbies marks even pairs of queued lobbies (same mode) as
// 'matched' atomically. Returns the count of lobbies that flipped status.
func pairQueuedLobbies(ctx context.Context, store *postgres.Store) (int64, error) {
	// Pair within the same mode, oldest-first. The CTE picks an even
	// number of lobbies and ROW_NUMBER assigns them to pair-indices.
	// Single SQL keeps this race-free on a single-instance backend; for
	// multi-pod we'd want SELECT … FOR UPDATE SKIP LOCKED instead.
	tag, err := store.DB.Exec(ctx, `
        WITH ranked AS (
            SELECT id,
                   mode,
                   ROW_NUMBER() OVER (PARTITION BY mode ORDER BY created_at) AS rn,
                   COUNT(*)    OVER (PARTITION BY mode)                       AS total
            FROM arena_lobbies
            WHERE status = 'queued' AND expires_at > NOW()
        )
        UPDATE arena_lobbies
        SET status = 'matched'
        WHERE id IN (
            SELECT id FROM ranked
            WHERE rn <= (total - total % 2)
        )
    `)
	if err != nil {
		return 0, fmt.Errorf("match lobbies: %w", err)
	}
	return tag.RowsAffected(), nil
}
