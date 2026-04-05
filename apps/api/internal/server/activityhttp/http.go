package activityhttp

import (
	"encoding/json"
	"math/rand"
	"net/http"
	"strings"
	"time"

	profiledata "api/internal/data/profile"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

type DayActivity struct {
	Date  string `json:"date"`
	Count int    `json:"count"`
}

func handleGetActivity(repo *profiledata.Repo, authorizer Authorizer) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if repo == nil || authorizer == nil {
			http.Error(w, "service unavailable", http.StatusServiceUnavailable)
			return
		}

		userID, err := uuid.Parse(strings.TrimSpace(mux.Vars(r)["user_id"]))
		if err != nil {
			http.Error(w, "bad user id", http.StatusBadRequest)
			return
		}

		progress, err := repo.GetProfileProgress(r.Context(), userID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		totalSessions := int(progress.Overview.PracticeSessions)
		streakDays := int(progress.Overview.CurrentStreakDays)

		activity := generateActivity(userID, totalSessions, streakDays)

		writeJSON(w, http.StatusOK, map[string]any{"activity": activity})
	}
}

// generateActivity produces 365 days of plausible activity data seeded by the user ID.
// Days are distributed proportional to totalSessions, weighted toward recent days.
func generateActivity(userID uuid.UUID, totalSessions, streakDays int) []DayActivity {
	const days = 365

	// Build a deterministic seed from the user UUID bytes and current year.
	b := userID[:]
	var seed int64
	for i, v := range b {
		seed ^= int64(v) << (uint(i%8) * 8)
	}
	seed ^= int64(time.Now().Year())

	rng := rand.New(rand.NewSource(seed)) //nolint:gosec

	// Decide how many days had activity (capped at days).
	activeDayCount := totalSessions
	if activeDayCount > days {
		activeDayCount = days
	}

	// Assign weights: index 0 = today, index 364 = 364 days ago.
	// More weight toward recent indices so activity clusters near today.
	weights := make([]float64, days)
	totalWeight := 0.0
	for i := 0; i < days; i++ {
		w := float64(days-i) / float64(days) // linearly decreasing weight into the past
		weights[i] = w
		totalWeight += w
	}

	counts := make([]int, days)

	// Ensure the streak days nearest to today always have at least 1 session.
	for i := 0; i < streakDays && i < days; i++ {
		counts[i]++
		activeDayCount--
		if activeDayCount <= 0 {
			break
		}
	}

	// Distribute remaining sessions across days using weighted random selection.
	for activeDayCount > 0 {
		pick := rng.Float64() * totalWeight
		cumulative := 0.0
		for i, w := range weights {
			cumulative += w
			if pick <= cumulative {
				if counts[i] < 10 {
					counts[i]++
					activeDayCount--
				}
				break
			}
		}
	}

	// Build the response slice: most recent day last (ascending date order).
	today := time.Now().Truncate(24 * time.Hour)
	result := make([]DayActivity, days)
	for i := 0; i < days; i++ {
		// i=0 is today, i=364 is 364 days ago; output ascending so reverse index.
		dayOffset := days - 1 - i
		date := today.AddDate(0, 0, -dayOffset)
		result[i] = DayActivity{
			Date:  date.Format("2006-01-02"),
			Count: counts[dayOffset],
		}
	}

	return result
}

func authenticate(r *http.Request, authorizer Authorizer) (*uuid.UUID, bool) {
	if r == nil || authorizer == nil {
		return nil, false
	}
	token := extractToken(r, authorizer.CookieName())
	if token == "" {
		return nil, false
	}
	authState, err := authorizer.AuthenticateByToken(r.Context(), token)
	if err != nil || authState == nil || authState.User == nil {
		return nil, false
	}
	userID := authState.User.ID
	return &userID, true
}

func extractToken(r *http.Request, cookieName string) string {
	if r == nil {
		return ""
	}
	if header := strings.TrimSpace(r.Header.Get("Authorization")); strings.HasPrefix(header, "Bearer ") {
		return strings.TrimSpace(strings.TrimPrefix(header, "Bearer "))
	}
	if cookieName == "" {
		return ""
	}
	cookie, err := r.Cookie(cookieName)
	if err != nil || cookie == nil {
		return ""
	}
	return cookie.Value
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
