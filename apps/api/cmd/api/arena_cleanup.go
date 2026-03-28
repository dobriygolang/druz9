package main

import (
	"context"
	"time"

	apparena "api/internal/app/arena"

	klog "github.com/go-kratos/kratos/v2/log"
)

const (
	arenaCleanupInterval = 5 * time.Minute
	arenaIdleTTL         = 10 * time.Minute
)

func startArenaCleanupWorker(logger klog.Logger, service *apparena.Service) func() error {
	ctx, cancel := context.WithCancel(context.Background())

	runCleanup := func() {
		cleanupCtx, cleanupCancel := context.WithTimeout(ctx, 30*time.Second)
		defer cleanupCancel()

		deleted, err := service.CleanupInactiveMatches(cleanupCtx, arenaIdleTTL)
		if err != nil {
			klog.Errorf("arena cleanup error: %v", err)
			return
		}
		if deleted > 0 {
			klog.Infof("arena cleanup deleted %d inactive invite matches", deleted)
		}
	}

	go func() {
		ticker := time.NewTicker(arenaCleanupInterval)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				runCleanup()
			}
		}
	}()

	return func() error {
		cancel()
		return nil
	}
}
