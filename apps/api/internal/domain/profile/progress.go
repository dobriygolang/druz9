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
