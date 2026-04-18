package model

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
