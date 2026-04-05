package dailychallengehttp

import (
	"encoding/json"
	"net/http"
	"time"

	appcodeeditor "api/internal/app/codeeditor"
	domain "api/internal/domain/codeeditor"
)

func handleDailyChallenge(svc *appcodeeditor.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if svc == nil {
			http.Error(w, "service unavailable", http.StatusServiceUnavailable)
			return
		}

		tasks, err := svc.ListTasks(r.Context(), domain.TaskFilter{
			IncludeInactive: false,
		})
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		if len(tasks) == 0 {
			http.Error(w, "no tasks available", http.StatusNotFound)
			return
		}

		now := time.Now()
		// Use the year-day as a stable daily index into the task list.
		idx := now.YearDay() % len(tasks)
		task := tasks[idx]

		// Compute the expiry: midnight of the next day (UTC).
		tomorrow := time.Date(now.UTC().Year(), now.UTC().Month(), now.UTC().Day()+1, 0, 0, 0, 0, time.UTC)

		writeJSON(w, http.StatusOK, map[string]any{
			"task":       task,
			"date":       now.UTC().Format("2006-01-02"),
			"expires_at": tomorrow.Format(time.RFC3339),
		})
	}
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
