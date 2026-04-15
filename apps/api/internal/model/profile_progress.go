package model

import "time"

type ProfileProgressOverview struct {
	PracticeSessions       int32      `json:"practiceSessions"`
	PracticePassedSessions int32      `json:"practicePassedSessions"`
	PracticeActiveDays     int32      `json:"practiceActiveDays"`
	CompletedMockSessions  int32      `json:"completedMockSessions"`
	CompletedMockStages    int32      `json:"completedMockStages"`
	AnsweredQuestions      int32      `json:"answeredQuestions"`
	AverageStageScore      float64    `json:"averageStageScore"`
	AverageQuestionScore   float64    `json:"averageQuestionScore"`
	CurrentStreakDays      int32      `json:"currentStreakDays"`
	LastActivityAt         *time.Time `json:"lastActivityAt,omitempty"`
	Level                  int32      `json:"level"`
	LevelProgress          float64    `json:"levelProgress"`
	TotalXP                int32      `json:"totalXp"`
	LongestStreakDays      int32      `json:"longestStreakDays"`
	ActivityPercentile     int32      `json:"activityPercentile"`
}

type ProfileCompetency struct {
	Key                    string  `json:"key"`
	Label                  string  `json:"label"`
	Score                  int32   `json:"score"`
	PracticeScore          int32   `json:"practiceScore"`
	VerifiedScore          int32   `json:"verifiedScore"`
	StageCount             int32   `json:"stageCount"`
	QuestionCount          int32   `json:"questionCount"`
	PracticeSessions       int32   `json:"practiceSessions"`
	PracticePassedSessions int32   `json:"practicePassedSessions"`
	PracticeDays           int32   `json:"practiceDays"`
	Confidence             string  `json:"confidence"`
	AverageScore           float64 `json:"averageScore"`
	Level                  string  `json:"level"`
	LevelProgress          float64 `json:"levelProgress"`
	NextMilestone          string  `json:"nextMilestone"`
	ScoreDelta30d          int32   `json:"scoreDelta30d"`
}

type ProfileProgressRecommendation struct {
	Key         string `json:"key"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Href        string `json:"href"`
}

type ProfileCheckpointProgress struct {
	ID         string     `json:"id"`
	TaskID     string     `json:"taskId"`
	TaskTitle  string     `json:"taskTitle"`
	SkillKey   string     `json:"skillKey"`
	SkillLabel string     `json:"skillLabel"`
	Score      int32      `json:"score"`
	FinishedAt *time.Time `json:"finishedAt,omitempty"`
}

type ProfileMockSession struct {
	ID                string `json:"id"`
	CompanyTag        string `json:"companyTag"`
	Status            string `json:"status"`
	CurrentStageIndex int32  `json:"currentStageIndex"`
	TotalStages       int32  `json:"totalStages"`
	CurrentStageKind  string `json:"currentStageKind"`
}

type NextAction struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	ActionType  string `json:"actionType"`
	ActionURL   string `json:"actionUrl"`
	Priority    int32  `json:"priority"`
	SkillKey    string `json:"skillKey"`
}

type UserGoal struct {
	Kind    string `json:"kind"`
	Company string `json:"company"`
}

// FeedItem represents a single activity event in the user's profile feed.
type FeedItem struct {
	Type        string     `json:"type"`
	Title       string     `json:"title"`
	Description string     `json:"description"`
	Score       *int32     `json:"score,omitempty"`
	Timestamp   time.Time  `json:"timestamp"`
}

type ProfileProgress struct {
	Overview        ProfileProgressOverview          `json:"overview"`
	Competencies    []*ProfileCompetency             `json:"competencies"`
	Strongest       []*ProfileCompetency             `json:"strongest"`
	Weakest         []*ProfileCompetency             `json:"weakest"`
	Recommendations []*ProfileProgressRecommendation `json:"recommendations"`
	Checkpoints     []*ProfileCheckpointProgress     `json:"checkpoints"`
	Companies       []string                         `json:"companies"`
	MockSessions    []*ProfileMockSession            `json:"mockSessions"`
	NextActions     []*NextAction                    `json:"nextActions"`
	Goal            *UserGoal                        `json:"goal"`
}
