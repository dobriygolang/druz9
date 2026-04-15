package model

// Readiness represents the user's overall interview readiness assessment.
type Readiness struct {
	Score            int32                `json:"score"`
	Level            string               `json:"level"`
	LevelLabel       string               `json:"levelLabel"`
	WeakestSkill     *ProfileCompetency   `json:"weakestSkill,omitempty"`
	StrongestSkill   *ProfileCompetency   `json:"strongestSkill,omitempty"`
	NextAction       *ReadinessNextAction `json:"nextAction,omitempty"`
	CompanyReadiness []*CompanyReadiness  `json:"companyReadiness,omitempty"`
	StreakDays       int32                `json:"streakDays"`
	ActiveDays       int32                `json:"activeDays"`
}

// ReadinessNextAction represents the single most impactful next step.
type ReadinessNextAction struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	ActionType  string `json:"actionType"`
	ActionURL   string `json:"actionUrl"`
	SkillKey    string `json:"skillKey,omitempty"`
}

// CompanyReadiness tracks mock interview progress per company.
type CompanyReadiness struct {
	Company         string `json:"company"`
	TotalStages     int32  `json:"totalStages"`
	CompletedStages int32  `json:"completedStages"`
	Percent         int32  `json:"percent"`
	HasActive       bool   `json:"hasActive"`
}
