package main

import (
	"context"
	"errors"
	"time"

	klog "github.com/go-kratos/kratos/v2/log"

	"api/internal/boosty"
	premiumdata "api/internal/data/premium"
)

// startBoostyRenewalWorker runs daily at 04:00 UTC and re-checks Boosty
// subscriptions that expire within the next 3 days. Active ones get a
// refreshed expires_at; lapsed ones are deactivated.
func startBoostyRenewalWorker(repo *premiumdata.Repo, client *boosty.Client) func() error {
	ctx, cancel := context.WithCancel(context.Background())

	go func() {
		for {
			now := time.Now().UTC()
			next := nextDailyAt(now, 4, 0)

			select {
			case <-ctx.Done():
				return
			case <-time.After(time.Until(next)):
				runBoostyRenewal(context.Background(), repo, client)
			}
		}
	}()

	return func() error {
		cancel()
		return nil
	}
}

func nextDailyAt(now time.Time, hour, minute int) time.Time {
	candidate := time.Date(now.Year(), now.Month(), now.Day(), hour, minute, 0, 0, time.UTC)
	if !candidate.After(now.Add(time.Minute)) {
		candidate = candidate.Add(24 * time.Hour)
	}
	return candidate
}

func runBoostyRenewal(ctx context.Context, repo *premiumdata.Repo, client *boosty.Client) {
	if client == nil {
		return
	}

	rows, err := repo.ListExpiringSoon(ctx, 3*24*time.Hour)
	if err != nil {
		klog.Errorf("boosty renewal: list expiring: %v", err)
		return
	}
	if len(rows) == 0 {
		klog.Infof("boosty renewal: no subscriptions expiring soon")
		return
	}

	klog.Infof("boosty renewal: checking %d expiring subscriptions", len(rows))

	renewed, deactivated := 0, 0
	for _, row := range rows {
		if row.BoostyEmail == "" {
			continue
		}

		info, err := client.CheckSubscriber(ctx, row.BoostyEmail)
		if errors.Is(err, boosty.ErrNotSubscribed) {
			// Subscription lapsed — deactivate.
			if deactErr := repo.Deactivate(ctx, row.UserID); deactErr != nil {
				klog.Errorf("boosty renewal: deactivate user=%s: %v", row.UserID, deactErr)
			} else {
				deactivated++
			}
			continue
		}
		if err != nil {
			klog.Errorf("boosty renewal: check user=%s email=%s: %v", row.UserID, row.BoostyEmail, err)
			continue
		}

		// Still subscribed — extend expires_at.
		expiresAt := info.ExpiresAt
		maxExpiry := time.Now().Add(31 * 24 * time.Hour)
		if expiresAt.IsZero() || expiresAt.After(maxExpiry) {
			expiresAt = maxExpiry
		}

		if upsertErr := repo.Upsert(ctx, premiumdata.Row{
			UserID:      row.UserID,
			Source:      row.Source,
			BoostyEmail: row.BoostyEmail,
			Active:      true,
			StartsAt:    row.StartsAt,
			ExpiresAt:   expiresAt,
		}); upsertErr != nil {
			klog.Errorf("boosty renewal: upsert user=%s: %v", row.UserID, upsertErr)
		} else {
			renewed++
		}
	}

	klog.Infof("boosty renewal: renewed=%d deactivated=%d", renewed, deactivated)
}
