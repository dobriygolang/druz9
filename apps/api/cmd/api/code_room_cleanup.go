package main

import (
	"context"
	"time"

	appcodeeditor "api/internal/app/codeeditor"

	klog "github.com/go-kratos/kratos/v2/log"
)

const (
	codeRoomCleanupInterval = 15 * time.Minute
	codeRoomIdleTTL         = 60 * time.Minute
)

func startCodeRoomCleanupWorker(logger klog.Logger, service *appcodeeditor.Service) func() error {
	ctx, cancel := context.WithCancel(context.Background())

	runCleanup := func() {
		cleanupCtx, cleanupCancel := context.WithTimeout(ctx, 30*time.Second)
		defer cleanupCancel()

		deleted, err := service.CleanupInactiveRooms(cleanupCtx, codeRoomIdleTTL)
		if err != nil {
			klog.Errorf("code room cleanup error: %v", err)
			return
		}
		if deleted > 0 {
			klog.Infof("code room cleanup deleted %d inactive rooms", deleted)
		}
	}

	go func() {
		ticker := time.NewTicker(codeRoomCleanupInterval)
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
