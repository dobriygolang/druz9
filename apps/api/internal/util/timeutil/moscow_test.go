package timeutil

import (
	"testing"
	"time"
)

func TestParseMoscowDateTime(t *testing.T) {
	t.Parallel()

	t.Run("parses datetime-local minute value as Moscow time", func(t *testing.T) {
		t.Parallel()

		got, err := ParseMoscowDateTime("2026-04-16T10:22")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		want := time.Date(2026, time.April, 16, 7, 22, 0, 0, time.UTC)
		if !got.Equal(want) {
			t.Fatalf("expected %s, got %s", want.Format(time.RFC3339), got.Format(time.RFC3339))
		}
	})

	t.Run("keeps explicit timezone instant", func(t *testing.T) {
		t.Parallel()

		got, err := ParseMoscowDateTime("2026-04-16T10:22:00+03:00")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		want := time.Date(2026, time.April, 16, 7, 22, 0, 0, time.UTC)
		if !got.Equal(want) {
			t.Fatalf("expected %s, got %s", want.Format(time.RFC3339), got.Format(time.RFC3339))
		}
	})

	t.Run("rejects invalid format", func(t *testing.T) {
		t.Parallel()

		if _, err := ParseMoscowDateTime("2026/04/16 10:22"); err == nil {
			t.Fatal("expected parse error")
		}
	})
}
