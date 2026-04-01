package main

import (
	"context"
	"time"

	"api/internal/metrics"
	"api/internal/rtc"

	klog "github.com/go-kratos/kratos/v2/log"
)

const (
	businessMetricsInterval  = 30 * time.Second
	activeUsersWindow        = 15 * time.Minute
	defaultCodeRoomIdleTTL   = 60 * time.Minute
	defaultArenaMatchIdleTTL = 10 * time.Minute
)

func startBusinessMetricsWorker(logger klog.Logger, rtcManager *rtc.Manager, storage *storageContext) func() error {
	ctx, cancel := context.WithCancel(context.Background())

	codeRoomIdleTTL := rtcManager.GetValue(ctx, rtc.CodeRoomIdleTtl).Duration()
	if codeRoomIdleTTL <= 0 {
		codeRoomIdleTTL = defaultCodeRoomIdleTTL
	}

	arenaIdleTTL := rtcManager.GetValue(ctx, rtc.ArenaIdleTtl).Duration()
	if arenaIdleTTL <= 0 {
		arenaIdleTTL = defaultArenaMatchIdleTTL
	}

	_ = rtcManager.WatchValue(ctx, rtc.CodeRoomIdleTtl, func(oldVar, newVar rtc.Variable) {
		next := newVar.Value().Duration()
		if next > 0 {
			codeRoomIdleTTL = next
		}
	})
	_ = rtcManager.WatchValue(ctx, rtc.ArenaIdleTtl, func(oldVar, newVar rtc.Variable) {
		next := newVar.Value().Duration()
		if next > 0 {
			arenaIdleTTL = next
		}
	})

	refresh := func() {
		refreshCtx, refreshCancel := context.WithTimeout(ctx, 10*time.Second)
		defer refreshCancel()

		roomsCount, err := storage.codeEditorRepo.CountOpenRooms(refreshCtx, time.Now().Add(-codeRoomIdleTTL))
		if err != nil {
			klog.Errorf("business metrics rooms refresh error: %v", err)
		} else {
			metrics.SetActiveRooms(roomsCount)
		}

		matchesCount, err := storage.arenaRepo.CountOpenMatches(refreshCtx, time.Now().Add(-arenaIdleTTL))
		if err != nil {
			klog.Errorf("business metrics matches refresh error: %v", err)
		} else {
			metrics.SetActiveMatches(matchesCount)
		}

		usersCount, err := storage.profileRepo.CountActiveUsers(refreshCtx, time.Now().Add(-activeUsersWindow))
		if err != nil {
			klog.Errorf("business metrics users refresh error: %v", err)
		} else {
			metrics.SetActiveUsers(usersCount)
		}
	}

	go func() {
		ticker := time.NewTicker(businessMetricsInterval)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				refresh()
			}
		}
	}()

	refresh()

	return func() error {
		cancel()
		return nil
	}
}
