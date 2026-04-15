package mission

import (
	"api/internal/model"
	"crypto/sha256"
	"encoding/binary"
	"time"
)

// MissionDef defines a mission template in the static pool.
type MissionDef struct {
	Key         string
	Title       string
	Description string
	TargetValue int32
	XPReward    int32
	ActionURL   string
	Icon        string // lucide-react icon name
	Category    string // "practice", "arena", "prep", "general"
}

// dailyPool is the static pool of daily mission definitions.
var dailyPool = []MissionDef{
	{
		Key: "solve_practice_1", Title: "Solve a practice task",
		Description: "Solve 1 practice task", TargetValue: 1, XPReward: 15,
		ActionURL: "/practice/code-rooms", Icon: "Code2", Category: "practice",
	},
	{
		Key: "win_arena_1", Title: "Win an arena duel",
		Description: "Win 1 arena duel", TargetValue: 1, XPReward: 15,
		ActionURL: "/practice/arena", Icon: "Swords", Category: "arena",
	},
	{
		Key: "mock_stage_1", Title: "Complete a mock stage",
		Description: "Complete 1 mock interview stage", TargetValue: 1, XPReward: 15,
		ActionURL: "/prepare/interview-prep", Icon: "GraduationCap", Category: "prep",
	},
	{
		Key: "maintain_streak", Title: "Keep your streak alive",
		Description: "Have any activity today", TargetValue: 1, XPReward: 15,
		ActionURL: "/practice", Icon: "Flame", Category: "general",
	},
	{
		Key: "daily_challenge", Title: "Solve the daily challenge",
		Description: "Complete today's daily challenge", TargetValue: 1, XPReward: 15,
		ActionURL: "/practice/daily", Icon: "Calendar", Category: "practice",
	},
	{
		Key: "submit_practice_3", Title: "Submit 3 practice attempts",
		Description: "Submit at least 3 code attempts", TargetValue: 3, XPReward: 15,
		ActionURL: "/practice/code-rooms", Icon: "Send", Category: "practice",
	},
	{
		Key: "play_arena_2", Title: "Play 2 arena matches",
		Description: "Play at least 2 arena matches", TargetValue: 2, XPReward: 15,
		ActionURL: "/practice/arena", Icon: "Swords", Category: "arena",
	},
	{
		Key: "prep_session_1", Title: "Complete a prep session",
		Description: "Complete 1 interview prep session", TargetValue: 1, XPReward: 15,
		ActionURL: "/prepare/interview-prep", Icon: "BookOpen", Category: "prep",
	},
	{
		Key: "win_arena_2", Title: "Win 2 arena duels",
		Description: "Win at least 2 arena duels", TargetValue: 2, XPReward: 15,
		ActionURL: "/practice/arena", Icon: "Trophy", Category: "arena",
	},
	{
		Key: "mock_stages_2", Title: "Complete 2 mock stages",
		Description: "Complete at least 2 mock stages", TargetValue: 2, XPReward: 15,
		ActionURL: "/prepare/interview-prep", Icon: "GraduationCap", Category: "prep",
	},
	{
		Key: "solve_practice_2", Title: "Solve 2 practice tasks",
		Description: "Solve at least 2 practice tasks", TargetValue: 2, XPReward: 15,
		ActionURL: "/practice/code-rooms", Icon: "Code2", Category: "practice",
	},
	{
		Key: "mock_full_1", Title: "Complete a mock interview",
		Description: "Complete 1 full mock interview", TargetValue: 1, XPReward: 15,
		ActionURL: "/prepare/interview-prep", Icon: "Award", Category: "prep",
	},
	// ── Challenge modes ──
	{
		Key: "daily_quality_7", Title: "Get 7+ AI score on daily",
		Description: "Score 7 or higher on the daily challenge", TargetValue: 1, XPReward: 20,
		ActionURL: "/practice/daily", Icon: "Star", Category: "challenge",
	},
	{
		Key: "blind_review_1", Title: "Complete a blind review",
		Description: "Review someone else's code", TargetValue: 1, XPReward: 15,
		ActionURL: "/practice/blind-review", Icon: "Eye", Category: "challenge",
	},
	{
		Key: "blind_review_qual", Title: "Get 7+ on blind review",
		Description: "Score 7+ on a blind code review", TargetValue: 1, XPReward: 20,
		ActionURL: "/practice/blind-review", Icon: "Eye", Category: "challenge",
	},
	{
		Key: "beat_pb", Title: "Beat a personal best",
		Description: "Set a new personal best on any task", TargetValue: 1, XPReward: 20,
		ActionURL: "/practice/speed-run", Icon: "Zap", Category: "challenge",
	},
	{
		Key: "weekly_boss", Title: "Attempt the Weekly Boss",
		Description: "Submit a solution for the Weekly Boss", TargetValue: 1, XPReward: 15,
		ActionURL: "/practice/weekly-boss", Icon: "Crown", Category: "challenge",
	},
	{
		Key: "weekly_boss_qual", Title: "Get 7+ on Weekly Boss",
		Description: "Score 7+ on the Weekly Boss challenge", TargetValue: 1, XPReward: 25,
		ActionURL: "/practice/weekly-boss", Icon: "Crown", Category: "challenge",
	},
}

// AllCompleteBonusXP is the bonus XP for completing all daily missions.
const AllCompleteBonusXP int32 = 20

// MissionsPerDay is the number of daily missions selected.
const MissionsPerDay = 3

// SelectDailyMissions deterministically picks 3 non-overlapping missions
// for a given user on a given date using a hash-based selection.
func SelectDailyMissions(userID string, date time.Time) []MissionDef {
	dateKey := date.UTC().Format("2006-01-02")
	seed := hashSeed(userID + ":" + dateKey)

	poolSize := len(dailyPool)
	if poolSize == 0 {
		return nil
	}

	selected := make([]MissionDef, 0, MissionsPerDay)
	used := make(map[int]bool, MissionsPerDay)

	for i := 0; i < MissionsPerDay; i++ {
		// Derive a sub-seed for each slot to avoid collisions.
		slotSeed := seed + uint64(i)*7919
		idx := int(slotSeed % uint64(poolSize))

		// Linear probe to find an unused slot.
		for attempts := 0; attempts < poolSize; attempts++ {
			candidate := (idx + attempts) % poolSize
			if !used[candidate] && !categorySaturated(selected, dailyPool[candidate].Category) {
				used[candidate] = true
				selected = append(selected, dailyPool[candidate])
				break
			}
		}
	}

	return selected
}

// categorySaturated returns true if the category already has 2+ missions selected
// (soft limit to avoid all 3 missions from the same feature).
func categorySaturated(selected []MissionDef, category string) bool {
	count := 0
	for _, s := range selected {
		if s.Category == category {
			count++
		}
	}
	return count >= 2
}

func hashSeed(input string) uint64 {
	h := sha256.Sum256([]byte(input))
	return binary.BigEndian.Uint64(h[:8])
}

// PeriodKeyForDate returns the daily period key ("2006-01-02") for a date.
func PeriodKeyForDate(t time.Time) string {
	return t.UTC().Format("2006-01-02")
}

// BuildDailyMissions selects missions and populates progress from ActivityCounts.
func BuildDailyMissions(userID string, date time.Time, counts *ActivityCounts, completions map[string]bool) *model.DailyMissionsResponse {
	defs := SelectDailyMissions(userID, date)
	missions := make([]*model.DailyMission, 0, len(defs))
	completedCount := int32(0)

	for _, def := range defs {
		current := resolveProgress(def.Key, counts)
		completed := completions[def.Key] || current >= def.TargetValue
		if completed {
			completedCount++
			if current < def.TargetValue {
				current = def.TargetValue
			}
		}

		missions = append(missions, &model.DailyMission{
			Key:         def.Key,
			Title:       def.Title,
			Description: def.Description,
			TargetValue: def.TargetValue,
			Current:     current,
			Completed:   completed,
			XPReward:    def.XPReward,
			ActionURL:   def.ActionURL,
			Icon:        def.Icon,
		})
	}

	allComplete := completedCount == int32(len(missions))
	bonusXP := int32(0)
	if allComplete {
		bonusXP = AllCompleteBonusXP
	}
	totalXP := completedCount*15 + bonusXP

	return &model.DailyMissionsResponse{
		Missions:       missions,
		AllComplete:    allComplete,
		CompletedCount: completedCount,
		BonusXP:        bonusXP,
		TotalXPEarned:  totalXP,
	}
}
