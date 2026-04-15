package achievement

import "fmt"

// Achievement is a single badge that can be unlocked by a user.
type Achievement struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Icon        string `json:"icon"`
	Unlocked    bool   `json:"unlocked"`
	Category    string `json:"category"`
	Tier        string `json:"tier"`
	Progress    int32  `json:"progress"`
	Target      int32  `json:"target"`
}

type tier struct {
	suffix string
	target int32
	tier   string
}

type group struct {
	base     string
	title    string
	desc     string
	icon     string
	category string
	tiers    []tier
	getValue func(practiceSessions, practicePassedSessions, completedMockSessions, currentStreakDays int32) int32
}

var groups = []group{
	{
		base: "sessions", title: "Сессии практики", desc: "Завершите %d сессий практики",
		icon: "🎯", category: "practice",
		tiers: []tier{
			{"_bronze", 1, "bronze"}, {"_silver", 10, "silver"}, {"_gold", 50, "gold"}, {"_diamond", 200, "diamond"},
		},
		getValue: func(ps, _, _, _ int32) int32 { return ps },
	},
	{
		base: "passed", title: "Решённые задачи", desc: "Решите %d задач",
		icon: "✅", category: "practice",
		tiers: []tier{
			{"_bronze", 1, "bronze"}, {"_silver", 10, "silver"}, {"_gold", 50, "gold"}, {"_diamond", 200, "diamond"},
		},
		getValue: func(_, pps, _, _ int32) int32 { return pps },
	},
	{
		base: "mocks", title: "Mock интервью", desc: "Пройдите %d mock интервью",
		icon: "🤝", category: "practice",
		tiers: []tier{
			{"_bronze", 1, "bronze"}, {"_silver", 5, "silver"}, {"_gold", 20, "gold"},
		},
		getValue: func(_, _, cms, _ int32) int32 { return cms },
	},
	{
		base: "streak", title: "Стрик", desc: "Занимайтесь %d дней подряд",
		icon: "🔥", category: "streak",
		tiers: []tier{
			{"_bronze", 3, "bronze"}, {"_silver", 7, "silver"}, {"_gold", 30, "gold"}, {"_diamond", 100, "diamond"},
		},
		getValue: func(_, _, _, csd int32) int32 { return csd },
	},
}

// Compute returns the list of achievements with their unlock status, tier, and
// progress based on the user's profile statistics.
func Compute(practiceSessions, practicePassedSessions, completedMockSessions, currentStreakDays int32) []Achievement {
	out := make([]Achievement, 0, 20)
	for _, g := range groups {
		currentValue := g.getValue(practiceSessions, practicePassedSessions, completedMockSessions, currentStreakDays)
		for _, t := range g.tiers {
			progress := currentValue
			if progress > t.target {
				progress = t.target
			}
			out = append(out, Achievement{
				ID:          g.base + t.suffix,
				Title:       g.title,
				Description: fmt.Sprintf(g.desc, t.target),
				Icon:        g.icon,
				Unlocked:    currentValue >= t.target,
				Category:    g.category,
				Tier:        t.tier,
				Progress:    progress,
				Target:      t.target,
			})
		}
	}
	return out
}
