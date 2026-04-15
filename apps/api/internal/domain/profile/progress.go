package profile

import (
	"fmt"
	"math"
	"slices"
	"sort"
	"time"

	"api/internal/model"
)

// ProgressSkillMeta holds display metadata for a skill competency.
type ProgressSkillMeta struct {
	Label string
	Href  string
}

// ProgressSkills defines the ordered list of tracked skill competencies.
var ProgressSkills = []struct {
	Key  string
	Meta ProgressSkillMeta
}{
	{Key: model.InterviewPrepMockStageKindSlices.String(), Meta: ProgressSkillMeta{Label: "Algorithms", Href: "/interview-prep?category=algorithm"}},
	{Key: model.InterviewPrepMockStageKindConcurrency.String(), Meta: ProgressSkillMeta{Label: "Coding", Href: "/interview-prep?category=coding"}},
	{Key: model.InterviewPrepMockStageKindSQL.String(), Meta: ProgressSkillMeta{Label: "SQL", Href: "/interview-prep?category=sql"}},
	{Key: model.InterviewPrepMockStageKindArchitecture.String(), Meta: ProgressSkillMeta{Label: "Code Review", Href: "/interview-prep"}},
	{Key: model.InterviewPrepMockStageKindSystemDesign.String(), Meta: ProgressSkillMeta{Label: "System Design", Href: "/interview-prep?category=system_design"}},
}

// SkillMetaByKey provides O(1) lookup for skill metadata.
var SkillMetaByKey = func() map[string]ProgressSkillMeta {
	m := make(map[string]ProgressSkillMeta, len(ProgressSkills))
	for _, s := range ProgressSkills {
		m[s.Key] = s.Meta
	}
	return m
}()

// ComputeCompetencyScore calculates a weighted competency score from stage and question averages.
func ComputeCompetencyScore(avgStage, avgQuestion float64, stageCount, questionCount int32) int32 {
	weighted := ResolveAverageScore(avgStage, avgQuestion, stageCount, questionCount)
	return int32(math.Round(weighted * 10))
}

// ComputePracticeScore calculates a practice-based score from pass rate, volume, and consistency.
func ComputePracticeScore(passedSessions, sessions, practiceDays int32) int32 {
	if sessions == 0 {
		return 0
	}
	passRate := float64(passedSessions) / float64(sessions)
	volumeFactor := math.Min(1, float64(sessions)/6)
	dayFactor := math.Min(1, float64(practiceDays)/3)
	return int32(math.Round((passRate*0.65 + volumeFactor*0.2 + dayFactor*0.15) * 100))
}

// ComputeBlendedScore blends verified and practice scores with confidence weighting.
func ComputeBlendedScore(verifiedScore, practiceScore int32) int32 {
	switch {
	case verifiedScore > 0 && practiceScore > 0:
		return int32(math.Round(float64(verifiedScore)*0.75 + float64(practiceScore)*0.25))
	case verifiedScore > 0:
		return verifiedScore
	case practiceScore > 0:
		return int32(math.Round(float64(practiceScore) * 0.35))
	default:
		return 0
	}
}

// ComputeConfidence determines the confidence level for a competency.
func ComputeConfidence(verifiedScore, practiceDays, practiceSessions int32) string {
	switch {
	case verifiedScore > 0:
		return "verified"
	case practiceDays >= 3:
		return "medium"
	case practiceSessions > 0:
		return "low"
	default:
		return "low"
	}
}

// ResolveAverageScore merges stage and question averages with configurable weights.
func ResolveAverageScore(avgStage, avgQuestion float64, stageCount, questionCount int32) float64 {
	switch {
	case stageCount > 0 && questionCount > 0:
		return avgStage*0.6 + avgQuestion*0.4
	case stageCount > 0:
		return avgStage
	case questionCount > 0:
		return avgQuestion
	default:
		return 0
	}
}

// SplitStrengths partitions competencies into strongest and weakest top-3 groups.
func SplitStrengths(items []*model.ProfileCompetency) ([]*model.ProfileCompetency, []*model.ProfileCompetency) {
	rated := make([]*model.ProfileCompetency, 0, len(items))
	for _, item := range items {
		if item == nil {
			continue
		}
		if item.StageCount == 0 && item.QuestionCount == 0 && item.PracticeSessions == 0 {
			continue
		}
		rated = append(rated, item)
	}
	if len(rated) == 0 {
		return []*model.ProfileCompetency{}, []*model.ProfileCompetency{}
	}

	sort.SliceStable(rated, func(i, j int) bool {
		if rated[i].Score == rated[j].Score {
			return rated[i].Label < rated[j].Label
		}
		return rated[i].Score > rated[j].Score
	})

	n := min(3, len(rated))
	strongest := append([]*model.ProfileCompetency(nil), rated[:n]...)

	weakest := append([]*model.ProfileCompetency(nil), rated[len(rated)-n:]...)
	slices.Reverse(weakest)

	return strongest, weakest
}

// BuildProfileRecommendations generates improvement recommendations from weakest competencies.
func BuildProfileRecommendations(weakest []*model.ProfileCompetency) []*model.ProfileProgressRecommendation {
	items := make([]*model.ProfileProgressRecommendation, 0, len(weakest))
	for _, competency := range weakest {
		if competency == nil || competency.Key == "" {
			continue
		}
		items = append(items, &model.ProfileProgressRecommendation{
			Key:         competency.Key,
			Title:       RecommendationTitle(competency.Key, competency.Label),
			Description: RecommendationDescription(competency),
			Href:        RecommendationHref(competency.Key),
		})
	}
	return items
}

// RecommendationTitle returns a localized title for a skill recommendation.
func RecommendationTitle(key, fallback string) string {
	switch key {
	case model.InterviewPrepMockStageKindSQL.String():
		return "Добить SQL-блок"
	case model.InterviewPrepMockStageKindConcurrency.String():
		return "Укрепить coding flow"
	case model.InterviewPrepMockStageKindArchitecture.String():
		return "Добрать code review"
	case model.InterviewPrepMockStageKindSystemDesign.String():
		return "Подтянуть system design"
	case model.InterviewPrepMockStageKindSlices.String():
		return "Подтянуть алгоритмы"
	default:
		return "Продолжить " + fallback
	}
}

// RecommendationDescription generates a contextual description for a recommendation.
func RecommendationDescription(item *model.ProfileCompetency) string {
	if item == nil {
		return ""
	}
	if item.Confidence != "verified" && item.PracticeSessions > 0 && item.PracticeDays < 3 {
		return fmt.Sprintf("По зоне %s уже есть practice, но confidence пока %s. Нужны еще независимые дни, чтобы сигнал стал устойчивее.", item.Label, item.Confidence)
	}
	if item.Confidence != "verified" && item.PracticeDays >= 3 {
		return fmt.Sprintf("По зоне %s уже собран practice volume. Следующий mock interview или checkpoint переведет ее в verified skill.", item.Label)
	}
	if item.StageCount == 0 && item.QuestionCount == 0 {
		return "Здесь еще нет попыток. Стоит добавить хотя бы один mock stage, чтобы получить реальный baseline."
	}
	return fmt.Sprintf("Текущий confidence по зоне %s: %d/100. Следующий mock или тематическая задача даст самый заметный прирост именно здесь.", item.Label, item.Score)
}

// RecommendationHref returns the navigation href for a skill key.
func RecommendationHref(key string) string {
	if meta, ok := SkillMetaByKey[key]; ok {
		return meta.Href
	}
	return "/interview-prep"
}

// SkillLabel returns the display label for a skill key.
func SkillLabel(key string) string {
	if meta, ok := SkillMetaByKey[key]; ok {
		return meta.Label
	}
	return key
}

// ComputeCurrentStreak counts consecutive activity days from today backwards.
func ComputeCurrentStreak(dates []time.Time, now time.Time) int32 {
	if len(dates) == 0 {
		return 0
	}

	today := TruncateDateUTC(now)
	current := TruncateDateUTC(dates[0])
	if current.Before(today.AddDate(0, 0, -1)) {
		return 0
	}

	streak := int32(1)
	for i := 1; i < len(dates); i++ {
		prev := TruncateDateUTC(dates[i-1])
		next := TruncateDateUTC(dates[i])
		if prev.AddDate(0, 0, -1).Equal(next) {
			streak++
			continue
		}
		break
	}

	return streak
}

// TruncateDateUTC truncates a time to the start of the UTC day.
func TruncateDateUTC(value time.Time) time.Time {
	year, month, day := value.UTC().Date()
	return time.Date(year, month, day, 0, 0, 0, 0, time.UTC)
}

// RoundTenth rounds a float to one decimal place.
func RoundTenth(value float64) float64 {
	return math.Round(value*10) / 10
}

// ── Skill levels ──────────────────────────────────────────────────────────

const (
	LevelBeginner  = "beginner"
	LevelConfident = "confident"
	LevelStrong    = "strong"
	LevelExpert    = "expert"
)

// ComputeLevel determines the skill level and intra-level progress for a competency.
func ComputeLevel(c *model.ProfileCompetency) (level string, progress float64) {
	if c == nil {
		return LevelBeginner, 0
	}
	score := c.Score
	totalSessions := c.PracticeSessions + c.StageCount

	switch {
	case c.VerifiedScore >= 85 && c.StageCount >= 5:
		// Expert: verified 85+ with 5+ mock stages
		return LevelExpert, clampProgress(float64(score-85) / 15)
	case c.VerifiedScore >= 60:
		// Strong: verified 60+
		return LevelStrong, clampProgress(float64(c.VerifiedScore-60) / 25)
	case score >= 30 && totalSessions >= 3:
		// Confident: blended score 30+ and 3+ total sessions
		return LevelConfident, clampProgress(float64(score-30) / 30)
	default:
		// Beginner
		if totalSessions == 0 {
			return LevelBeginner, 0
		}
		return LevelBeginner, clampProgress(float64(score) / 30)
	}
}

// ComputeNextMilestone returns a human-readable string describing what the user
// needs to do to reach the next level for a given competency.
func ComputeNextMilestone(c *model.ProfileCompetency) string {
	if c == nil {
		return "Реши первую задачу"
	}
	level, _ := ComputeLevel(c)
	switch level {
	case LevelBeginner:
		totalSessions := c.PracticeSessions + c.StageCount
		if totalSessions == 0 {
			return fmt.Sprintf("Реши первую задачу по %s", c.Label)
		}
		if c.Score < 30 {
			return fmt.Sprintf("Набери 30 баллов по %s (сейчас %d)", c.Label, c.Score)
		}
		needed := int32(3) - totalSessions
		if needed > 0 {
			return fmt.Sprintf("Реши ещё %d задач по %s", needed, c.Label)
		}
		return fmt.Sprintf("Продолжай практику по %s", c.Label)
	case LevelConfident:
		if c.VerifiedScore < 60 {
			return fmt.Sprintf("Пройди mock по %s для перехода в Strong (нужен verified 60+)", c.Label)
		}
		return fmt.Sprintf("Продолжай mock-интервью по %s", c.Label)
	case LevelStrong:
		if c.VerifiedScore < 85 {
			return fmt.Sprintf("Подними verified score до 85+ по %s (сейчас %d)", c.Label, c.VerifiedScore)
		}
		if c.StageCount < 5 {
			return fmt.Sprintf("Пройди ещё %d mock-этапов по %s", 5-c.StageCount, c.Label)
		}
		return fmt.Sprintf("Продолжай mock-интервью по %s", c.Label)
	case LevelExpert:
		return fmt.Sprintf("Поддерживай уровень Expert по %s", c.Label)
	default:
		return ""
	}
}

// ComputeNextActions generates up to 3 prioritized next actions based on
// the user's competencies and goal.
func ComputeNextActions(competencies []*model.ProfileCompetency, goal *model.UserGoal, streakDays int32) []*model.NextAction {
	actions := make([]*model.NextAction, 0, 3)

	// Find weakest competency (lowest score)
	var weakest *model.ProfileCompetency
	for _, c := range competencies {
		if c == nil {
			continue
		}
		if weakest == nil || c.Score < weakest.Score {
			weakest = c
		}
	}

	// Goal-driven prioritization
	targetCompetencies := prioritizeByGoal(competencies, goal)

	for _, c := range targetCompetencies {
		if len(actions) >= 3 {
			break
		}
		action := suggestAction(c, int32(len(actions)+1))
		if action != nil {
			actions = append(actions, action)
		}
	}

	// If streak is broken and we have room, add a streak action
	if streakDays == 0 && len(actions) < 3 {
		actions = append(actions, &model.NextAction{
			Title:       "Начни серию",
			Description: "Реши daily challenge чтобы запустить стрик",
			ActionType:  "daily",
			ActionURL:   "/daily-challenge",
			Priority:    int32(len(actions) + 1),
		})
	}

	return actions
}

func prioritizeByGoal(competencies []*model.ProfileCompetency, goal *model.UserGoal) []*model.ProfileCompetency {
	if len(competencies) == 0 {
		return competencies
	}

	// Copy and sort by score ascending (weakest first)
	sorted := make([]*model.ProfileCompetency, len(competencies))
	copy(sorted, competencies)

	goalKind := "general_growth"
	if goal != nil && goal.Kind != "" {
		goalKind = goal.Kind
	}

	switch goalKind {
	case "weakest_first":
		sort.SliceStable(sorted, func(i, j int) bool {
			return sorted[i].Score < sorted[j].Score
		})
	case "company_prep":
		// For company prep, focus on skills with lowest verified scores
		sort.SliceStable(sorted, func(i, j int) bool {
			return sorted[i].VerifiedScore < sorted[j].VerifiedScore
		})
	default: // general_growth
		// Balance: prioritize by lowest score
		sort.SliceStable(sorted, func(i, j int) bool {
			return sorted[i].Score < sorted[j].Score
		})
	}

	return sorted
}

func suggestAction(c *model.ProfileCompetency, priority int32) *model.NextAction {
	if c == nil {
		return nil
	}
	level, _ := ComputeLevel(c)

	switch {
	case level == LevelBeginner && c.PracticeSessions == 0 && c.StageCount == 0:
		return &model.NextAction{
			Title:       fmt.Sprintf("Начни %s", c.Label),
			Description: fmt.Sprintf("У тебя пока нет попыток по %s — реши первую задачу", c.Label),
			ActionType:  "practice",
			ActionURL:   RecommendationHref(c.Key),
			Priority:    priority,
			SkillKey:    c.Key,
		}
	case c.Confidence != "verified" && c.PracticeScore > 30:
		return &model.NextAction{
			Title:       fmt.Sprintf("Пройди mock по %s", c.Label),
			Description: fmt.Sprintf("Practice score %d — подтверди уровень через mock-интервью", c.PracticeScore),
			ActionType:  "mock",
			ActionURL:   RecommendationHref(c.Key),
			Priority:    priority,
			SkillKey:    c.Key,
		}
	case level == LevelBeginner:
		return &model.NextAction{
			Title:       fmt.Sprintf("Подтяни %s", c.Label),
			Description: fmt.Sprintf("%s — %d%%, зона роста", c.Label, c.Score),
			ActionType:  "practice",
			ActionURL:   RecommendationHref(c.Key),
			Priority:    priority,
			SkillKey:    c.Key,
		}
	case level == LevelConfident && c.VerifiedScore < 60:
		return &model.NextAction{
			Title:       fmt.Sprintf("Пройди mock по %s", c.Label),
			Description: fmt.Sprintf("Для перехода в Strong нужен verified 60+ (сейчас %d)", c.VerifiedScore),
			ActionType:  "mock",
			ActionURL:   RecommendationHref(c.Key),
			Priority:    priority,
			SkillKey:    c.Key,
		}
	case level == LevelStrong:
		return &model.NextAction{
			Title:       fmt.Sprintf("Доведи %s до Expert", c.Label),
			Description: fmt.Sprintf("Verified %d — нужно 85+ и 5 mock-этапов", c.VerifiedScore),
			ActionType:  "mock",
			ActionURL:   RecommendationHref(c.Key),
			Priority:    priority,
			SkillKey:    c.Key,
		}
	default:
		return nil
	}
}

func clampProgress(v float64) float64 {
	if v < 0 {
		return 0
	}
	if v > 1 {
		return 1
	}
	return math.Round(v*100) / 100
}

// MapPrepTypeToCompetencyKeys maps a prep type string to competency keys.
func MapPrepTypeToCompetencyKeys(prepType string) []string {
	switch model.InterviewPrepTypeFromString(prepType) {
	case model.InterviewPrepTypeAlgorithm:
		return []string{model.InterviewPrepMockStageKindSlices.String()}
	case model.InterviewPrepTypeCoding:
		return []string{model.InterviewPrepMockStageKindConcurrency.String()}
	case model.InterviewPrepTypeSQL:
		return []string{model.InterviewPrepMockStageKindSQL.String()}
	case model.InterviewPrepTypeSystemDesign:
		return []string{model.InterviewPrepMockStageKindSystemDesign.String()}
	case model.InterviewPrepTypeCodeReview:
		return []string{model.InterviewPrepMockStageKindArchitecture.String()}
	default:
		return nil
	}
}
