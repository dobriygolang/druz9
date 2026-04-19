package main

import (
	"context"
	"time"

	klog "github.com/go-kratos/kratos/v2/log"

	friendchallengedomain "api/internal/domain/friend_challenge"
)

// Sweeps PENDING/IN_PROGRESS friend_challenges whose deadline has passed
// into EXPIRED state. Runs on a ticker so players who never revisit the
// app still see their challenges close out cleanly (otherwise the list
// would fill with zombies).
//
// The domain method also runs lazily inside ListForUser, but relying on
// request traffic alone leaves expired rows untouched for accounts that
// sit idle — hence this worker.

const friendChallengeSweepInterval = 15 * time.Minute

func startFriendChallengeSweepWorker(_ klog.Logger, service *friendchallengedomain.Service) func() error {
	ctx, cancel := context.WithCancel(context.Background())

	runSweep := func() {
		sweepCtx, sweepCancel := context.WithTimeout(ctx, 30*time.Second)
		defer sweepCancel()
		n, err := service.SweepExpired(sweepCtx)
		if err != nil {
			klog.Errorf("friend_challenge sweep error: %v", err)
			return
		}
		if n > 0 {
			klog.Infof("friend_challenge sweep expired %d rows", n)
		}
	}

	go func() {
		ticker := time.NewTicker(friendChallengeSweepInterval)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				runSweep()
			}
		}
	}()

	runSweep()

	return func() error {
		cancel()
		return nil
	}
}
