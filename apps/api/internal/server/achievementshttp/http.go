package achievementshttp

import (
	"encoding/json"
	"net/http"
	"strings"

	profiledata "api/internal/data/profile"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

type Achievement struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Icon        string `json:"icon"`
	Unlocked    bool   `json:"unlocked"`
	UnlockedAt  string `json:"unlocked_at,omitempty"`
	Category    string `json:"category"`
}

type achievementDef struct {
	id          string
	title       string
	description string
	icon        string
	category    string
	check       func(practiceSessions, practicePassedSessions, completedMockSessions, currentStreakDays int32) bool
}

var achievementDefs = []achievementDef{
	{
		id:          "first_session",
		title:       "Первая сессия",
		description: "Завершите первую сессию практики",
		icon:        "🎯",
		category:    "practice",
		check: func(ps, pps, cms, csd int32) bool {
			return ps >= 1
		},
	},
	{
		id:          "ten_sessions",
		title:       "10 сессий",
		description: "Завершите 10 сессий практики",
		icon:        "⚡",
		category:    "practice",
		check: func(ps, pps, cms, csd int32) bool {
			return ps >= 10
		},
	},
	{
		id:          "fifty_sessions",
		title:       "50 сессий",
		description: "Завершите 50 сессий практики",
		icon:        "🔥",
		category:    "practice",
		check: func(ps, pps, cms, csd int32) bool {
			return ps >= 50
		},
	},
	{
		id:          "first_mock",
		title:       "Первое Mock интервью",
		description: "Пройдите первое Mock интервью",
		icon:        "🤝",
		category:    "practice",
		check: func(ps, pps, cms, csd int32) bool {
			return cms >= 1
		},
	},
	{
		id:          "five_mocks",
		title:       "5 Mock интервью",
		description: "Пройдите 5 Mock интервью",
		icon:        "💼",
		category:    "practice",
		check: func(ps, pps, cms, csd int32) bool {
			return cms >= 5
		},
	},
	{
		id:          "streak_3",
		title:       "Стрик 3 дня",
		description: "Занимайтесь 3 дня подряд",
		icon:        "📅",
		category:    "streak",
		check: func(ps, pps, cms, csd int32) bool {
			return csd >= 3
		},
	},
	{
		id:          "streak_7",
		title:       "Стрик 7 дней",
		description: "Занимайтесь 7 дней подряд",
		icon:        "🗓️",
		category:    "streak",
		check: func(ps, pps, cms, csd int32) bool {
			return csd >= 7
		},
	},
	{
		id:          "streak_30",
		title:       "Стрик 30 дней",
		description: "Занимайтесь 30 дней подряд",
		icon:        "🏆",
		category:    "streak",
		check: func(ps, pps, cms, csd int32) bool {
			return csd >= 30
		},
	},
	{
		id:          "first_pass",
		title:       "Первая решённая задача",
		description: "Решите первую задачу",
		icon:        "✅",
		category:    "practice",
		check: func(ps, pps, cms, csd int32) bool {
			return pps >= 1
		},
	},
	{
		id:          "ten_pass",
		title:       "10 решённых задач",
		description: "Решите 10 задач",
		icon:        "🌟",
		category:    "practice",
		check: func(ps, pps, cms, csd int32) bool {
			return pps >= 10
		},
	},
}

func handleGetAchievements(repo *profiledata.Repo, authorizer Authorizer) http.HandlerFunc {
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

		ov := progress.Overview
		achievements := make([]Achievement, 0, len(achievementDefs))
		for _, def := range achievementDefs {
			unlocked := def.check(ov.PracticeSessions, ov.PracticePassedSessions, ov.CompletedMockSessions, ov.CurrentStreakDays)
			a := Achievement{
				ID:          def.id,
				Title:       def.title,
				Description: def.description,
				Icon:        def.icon,
				Unlocked:    unlocked,
				Category:    def.category,
			}
			achievements = append(achievements, a)
		}

		writeJSON(w, http.StatusOK, map[string]any{"achievements": achievements})
	}
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
