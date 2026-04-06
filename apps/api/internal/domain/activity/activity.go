package activity

import (
	"math/rand"
	"time"

	"github.com/google/uuid"
)

// Day holds the activity count for a single calendar day.
type Day struct {
	Date  string `json:"date"`
	Count int    `json:"count"`
}

// Generate returns 365 days of plausible activity data seeded deterministically
// by userID so the output is stable across calls within the same calendar year.
func Generate(userID uuid.UUID, totalSessions, streakDays int) []Day {
	const days = 365

	var seed int64
	for i, v := range userID {
		seed ^= int64(v) << (uint(i%8) * 8)
	}
	seed ^= int64(time.Now().Year())

	rng := rand.New(rand.NewSource(seed)) //nolint:gosec

	activeDayCount := totalSessions
	if activeDayCount > days {
		activeDayCount = days
	}

	// Weight toward recent days (index 0 = today).
	weights := make([]float64, days)
	var totalWeight float64
	for i := range weights {
		w := float64(days-i) / float64(days)
		weights[i] = w
		totalWeight += w
	}

	counts := make([]int, days)

	for i := 0; i < streakDays && i < days && activeDayCount > 0; i++ {
		counts[i]++
		activeDayCount--
	}

	for activeDayCount > 0 {
		pick := rng.Float64() * totalWeight
		var cum float64
		for i, w := range weights {
			cum += w
			if pick <= cum {
				if counts[i] < 10 {
					counts[i]++
					activeDayCount--
				}
				break
			}
		}
	}

	today := time.Now().Truncate(24 * time.Hour)
	result := make([]Day, days)
	for i := range result {
		dayOffset := days - 1 - i
		result[i] = Day{
			Date:  today.AddDate(0, 0, -dayOffset).Format("2006-01-02"),
			Count: counts[dayOffset],
		}
	}
	return result
}
