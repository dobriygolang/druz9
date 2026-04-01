package main

import (
	"context"
	"time"

	apparena "api/internal/app/arena"
	"api/internal/rtc"

	klog "github.com/go-kratos/kratos/v2/log"
)

func startArenaCleanupWorker(logger klog.Logger, rtcManager *rtc.Manager, service *apparena.Service) func() error {
	ctx, cancel := context.WithCancel(context.Background())

	// Get initial values
	arenaIdleTTL := rtcManager.GetValue(ctx, rtc.ArenaIdleTtl).Duration()
	arenaCleanupInterval := rtcManager.GetValue(ctx, rtc.ArenaCleanupInterval).Duration()

	// Set defaults if not configured
	if arenaIdleTTL <= 0 {
		arenaIdleTTL = 10 * time.Minute
	}
	if arenaCleanupInterval <= 0 {
		arenaCleanupInterval = 5 * time.Minute
	}

	runCleanup := func() {
		cleanupCtx, cleanupCancel := context.WithTimeout(ctx, 30*time.Second)
		defer cleanupCancel()

		deleted, err := service.CleanupInactiveMatches(cleanupCtx, arenaIdleTTL)
		if err != nil {
			klog.Errorf("arena cleanup error: %v", err)
			return
		}
		if deleted > 0 {
			klog.Infof("arena cleanup processed %d inactive arena matches", deleted)
		}

		submissionsDeleted, err := service.CleanupOldSubmissions(cleanupCtx, 14*24*time.Hour)
		if err != nil {
			klog.Errorf("arena submissions cleanup error: %v", err)
		} else if submissionsDeleted > 0 {
			klog.Infof("arena cleanup deleted %d old submissions", submissionsDeleted)
		}

		statesDeleted, err := service.CleanupFinishedEditorStates(cleanupCtx, 24*time.Hour)
		if err != nil {
			klog.Errorf("arena editor states cleanup error: %v", err)
		} else if statesDeleted > 0 {
			klog.Infof("arena cleanup deleted %d finished editor states", statesDeleted)
		}
	}

	// Subscribe to config changes
	_ = rtcManager.WatchValue(ctx, rtc.ArenaIdleTtl, func(oldVar, newVar rtc.Variable) {
		arenaIdleTTL = newVar.Value().Duration()
		klog.Infof("arena idle TTL updated to %v", arenaIdleTTL)
	})
	_ = rtcManager.WatchValue(ctx, rtc.ArenaCleanupInterval, func(oldVar, newVar rtc.Variable) {
		arenaCleanupInterval = newVar.Value().Duration()
		klog.Infof("arena cleanup interval updated to %v", arenaCleanupInterval)
	})

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

	// Run initial cleanup
	runCleanup()

	return func() error {
		cancel()
		return nil
	}
}
