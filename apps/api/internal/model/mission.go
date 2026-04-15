package model

import "time"

// DailyMission represents a single daily mission with current progress.
type DailyMission struct {
	Key         string `json:"key"`
	Title       string `json:"title"`
	Description string `json:"description"`
	TargetValue int32  `json:"targetValue"`
	Current     int32  `json:"current"`
	Completed   bool   `json:"completed"`
	XPReward    int32  `json:"xpReward"`
	ActionURL   string `json:"actionUrl"`
	Icon        string `json:"icon"`
}

// DailyMissionsResponse is returned by the GET /api/v1/missions/daily endpoint.
type DailyMissionsResponse struct {
	Missions       []*DailyMission `json:"missions"`
	AllComplete    bool            `json:"allComplete"`
	CompletedCount int32           `json:"completedCount"`
	BonusXP        int32           `json:"bonusXp"`
	TotalXPEarned  int32           `json:"totalXpEarned"`
}

// MissionCompletion tracks that a user completed a specific mission in a period.
type MissionCompletion struct {
	UserID      string    `json:"userId"`
	MissionKey  string    `json:"missionKey"`
	PeriodKey   string    `json:"periodKey"`
	CompletedAt time.Time `json:"completedAt"`
}
