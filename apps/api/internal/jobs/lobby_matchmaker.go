package jobs

import (
	"context"
	"time"

	klog "github.com/go-kratos/kratos/v2/log"

	arenadata "api/internal/data/arena"
)

// startLobbyMatchmakerWorker pairs queued team_2v2 lobbies (ADR-004).
// Runs every 10s. The current implementation just flips the matched
// status on consecutive pairs — the full match-creation handoff to
// arena.Service.CreateMatch lands when the matchmaker grows team_2v2
// support. Until then this gives the frontend a way to observe
// "we got matched, redirect to lobby/match" via the lobby status field.
func StartLobbyMatchmaker(repo *arenadata.Repo) func() error {
	ctx, cancel := context.WithCancel(context.Background())

	go func() {
		ticker := time.NewTicker(10 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				if matched, err := repo.PairQueuedLobbies(context.Background()); err != nil {
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
