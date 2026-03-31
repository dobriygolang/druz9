package main

import (
	"context"
	"time"

	appcodeeditor "api/internal/app/codeeditor"
	"api/internal/rtc"

	klog "github.com/go-kratos/kratos/v2/log"
)

func startCodeRoomCleanupWorker(logger klog.Logger, rtcManager *rtc.Manager, service *appcodeeditor.Service) func() error {
	ctx, cancel := context.WithCancel(context.Background())

	// Get initial values
	codeRoomIdleTTL := rtcManager.GetValue(ctx, rtc.CodeRoomIdleTtl).Duration()
	codeRoomCleanupInterval := rtcManager.GetValue(ctx, rtc.CodeRoomCleanupInterval).Duration()

	// Set defaults if not configured
	if codeRoomIdleTTL <= 0 {
		codeRoomIdleTTL = 60 * time.Minute
	}
	if codeRoomCleanupInterval <= 0 {
		codeRoomCleanupInterval = 15 * time.Minute
	}

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

	// Subscribe to config changes
	_ = rtcManager.WatchValue(ctx, rtc.CodeRoomIdleTtl, func(oldVar, newVar rtc.Variable) {
		codeRoomIdleTTL = newVar.Value().Duration()
		klog.Infof("code room idle TTL updated to %v", codeRoomIdleTTL)
	})
	_ = rtcManager.WatchValue(ctx, rtc.CodeRoomCleanupInterval, func(oldVar, newVar rtc.Variable) {
		codeRoomCleanupInterval = newVar.Value().Duration()
		klog.Infof("code room cleanup interval updated to %v", codeRoomCleanupInterval)
	})

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

	// Run initial cleanup
	runCleanup()

	return func() error {
		cancel()
		return nil
	}
}
