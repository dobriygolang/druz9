package event

import (
	"testing"
	"time"

	"api/internal/model"
)

func TestNormalizeListEventsWindow(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, 4, 3, 12, 0, 0, 0, time.UTC)

	t.Run("applies default upcoming horizon", func(t *testing.T) {
		t.Parallel()

		opts := normalizeListEventsWindow(model.ListEventsOptions{}, now)

		if opts.From == nil || opts.To == nil {
			t.Fatal("expected both bounds to be set")
		}
		if got, want := *opts.From, now.Add(-12*time.Hour); !got.Equal(want) {
			t.Fatalf("unexpected from: got %v want %v", got, want)
		}
		if got, want := *opts.To, now.Add(maxEventsWindow); !got.Equal(want) {
			t.Fatalf("unexpected to: got %v want %v", got, want)
		}
	})

	t.Run("applies default past horizon", func(t *testing.T) {
		t.Parallel()

		opts := normalizeListEventsWindow(model.ListEventsOptions{Status: "past"}, now)

		if opts.From == nil || opts.To == nil {
			t.Fatal("expected both bounds to be set")
		}
		if got, want := *opts.From, now.Add(-maxEventsWindow); !got.Equal(want) {
			t.Fatalf("unexpected from: got %v want %v", got, want)
		}
		if got, want := *opts.To, now.Add(12*time.Hour); !got.Equal(want) {
			t.Fatalf("unexpected to: got %v want %v", got, want)
		}
	})

	t.Run("caps explicit oversized window", func(t *testing.T) {
		t.Parallel()

		from := now.AddDate(-2, 0, 0)
		to := now.AddDate(2, 0, 0)

		opts := normalizeListEventsWindow(model.ListEventsOptions{
			From: &from,
			To:   &to,
		}, now)

		if opts.To == nil {
			t.Fatal("expected to bound")
		}
		if got, want := *opts.To, from.Add(maxEventsWindow); !got.Equal(want) {
			t.Fatalf("unexpected clamped to: got %v want %v", got, want)
		}
	})

	t.Run("fills missing upper bound from explicit from", func(t *testing.T) {
		t.Parallel()

		from := now.AddDate(0, 2, 0)
		opts := normalizeListEventsWindow(model.ListEventsOptions{From: &from}, now)

		if opts.To == nil {
			t.Fatal("expected to bound")
		}
		if got, want := *opts.To, now.Add(maxEventsWindow); !got.Equal(want) {
			t.Fatalf("unexpected to: got %v want %v", got, want)
		}
	})
}
