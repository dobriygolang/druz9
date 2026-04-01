package main

import (
	"context"
	"time"

	klog "github.com/go-kratos/kratos/v2/log"
)

const (
	contentCleanupInterval = 6 * time.Hour
	expiredEventsTTL       = 45 * 24 * time.Hour
	stalePodcastDraftTTL   = 24 * time.Hour
)

func startContentCleanupWorker(logger klog.Logger, storage *storageContext) func() error {
	ctx, cancel := context.WithCancel(context.Background())

	runCleanup := func() {
		cleanupCtx, cleanupCancel := context.WithTimeout(ctx, 30*time.Second)
		defer cleanupCancel()

		if storage.eventRepo != nil {
			deleted, err := storage.eventRepo.CleanupExpiredEvents(cleanupCtx, expiredEventsTTL)
			if err != nil {
				klog.Errorf("content cleanup events error: %v", err)
			} else if deleted > 0 {
				klog.Infof("content cleanup deleted %d expired events", deleted)
			}
		}

		if storage.podcastRepo != nil {
			deleted, err := storage.podcastRepo.CleanupStaleDrafts(cleanupCtx, stalePodcastDraftTTL)
			if err != nil {
				klog.Errorf("content cleanup podcast drafts error: %v", err)
			} else if deleted > 0 {
				klog.Infof("content cleanup deleted %d stale podcast drafts", deleted)
			}
		}
	}

	go func() {
		ticker := time.NewTicker(contentCleanupInterval)
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

	runCleanup()

	return func() error {
		cancel()
		return nil
	}
}
