package achievement

// Achievement is a single badge that can be unlocked by a user.
type Achievement struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Icon        string `json:"icon"`
	Unlocked    bool   `json:"unlocked"`
	Category    string `json:"category"`
}

type def struct {
	id, title, description, icon, category string
	check                                  func(practiceSessions, practicePassedSessions, completedMockSessions, currentStreakDays int32) bool
}

var definitions = []def{
	{"first_session", "Первая сессия", "Завершите первую сессию практики", "🎯", "practice",
		func(ps, _, _, _ int32) bool { return ps >= 1 }},
	{"ten_sessions", "10 сессий", "Завершите 10 сессий практики", "⚡", "practice",
		func(ps, _, _, _ int32) bool { return ps >= 10 }},
	{"fifty_sessions", "50 сессий", "Завершите 50 сессий практики", "🔥", "practice",
		func(ps, _, _, _ int32) bool { return ps >= 50 }},
	{"first_mock", "Первое Mock интервью", "Пройдите первое Mock интервью", "🤝", "practice",
		func(_, _, cms, _ int32) bool { return cms >= 1 }},
	{"five_mocks", "5 Mock интервью", "Пройдите 5 Mock интервью", "💼", "practice",
		func(_, _, cms, _ int32) bool { return cms >= 5 }},
	{"streak_3", "Стрик 3 дня", "Занимайтесь 3 дня подряд", "📅", "streak",
		func(_, _, _, csd int32) bool { return csd >= 3 }},
	{"streak_7", "Стрик 7 дней", "Занимайтесь 7 дней подряд", "🗓️", "streak",
		func(_, _, _, csd int32) bool { return csd >= 7 }},
	{"streak_30", "Стрик 30 дней", "Занимайтесь 30 дней подряд", "🏆", "streak",
		func(_, _, _, csd int32) bool { return csd >= 30 }},
	{"first_pass", "Первая решённая задача", "Решите первую задачу", "✅", "practice",
		func(_, pps, _, _ int32) bool { return pps >= 1 }},
	{"ten_pass", "10 решённых задач", "Решите 10 задач", "🌟", "practice",
		func(_, pps, _, _ int32) bool { return pps >= 10 }},
}

// Compute returns the list of achievements with their unlock status based on
// the user's profile statistics.
func Compute(practiceSessions, practicePassedSessions, completedMockSessions, currentStreakDays int32) []Achievement {
	out := make([]Achievement, 0, len(definitions))
	for _, d := range definitions {
		out = append(out, Achievement{
			ID:          d.id,
			Title:       d.title,
			Description: d.description,
			Icon:        d.icon,
			Unlocked:    d.check(practiceSessions, practicePassedSessions, completedMockSessions, currentStreakDays),
			Category:    d.category,
		})
	}
	return out
}
