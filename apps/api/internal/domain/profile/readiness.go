package profile

import (
	"math"

	"api/internal/model"
)

// ReadinessLevel represents the user's interview readiness stage.
type ReadinessLevel string

const (
	ReadinessLevelNovice       ReadinessLevel = "novice"
	ReadinessLevelFoundation   ReadinessLevel = "foundation"
	ReadinessLevelPractitioner ReadinessLevel = "practitioner"
	ReadinessLevelCandidate    ReadinessLevel = "candidate"
	ReadinessLevelReady        ReadinessLevel = "ready"
)

// ReadinessLevelLabel returns a human-readable Russian label for the level.
func ReadinessLevelLabel(level ReadinessLevel) string {
	switch level {
	case ReadinessLevelNovice:
		return "Новичок"
	case ReadinessLevelFoundation:
		return "Фундамент"
	case ReadinessLevelPractitioner:
		return "Практик"
	case ReadinessLevelCandidate:
		return "Кандидат"
	case ReadinessLevelReady:
		return "Готов к офферу"
	default:
		return "Новичок"
	}
}

// ReadinessLevelFromScore maps a readiness score to a level.
func ReadinessLevelFromScore(score int32) ReadinessLevel {
	switch {
	case score >= 80:
		return ReadinessLevelReady
	case score >= 60:
		return ReadinessLevelCandidate
	case score >= 40:
		return ReadinessLevelPractitioner
	case score >= 20:
		return ReadinessLevelFoundation
	default:
		return ReadinessLevelNovice
	}
}

// ComputeReadiness calculates the overall readiness from existing ProfileProgress data.
func ComputeReadiness(p *model.ProfileProgress) *model.Readiness {
	if p == nil {
		return &model.Readiness{Level: string(ReadinessLevelNovice), LevelLabel: ReadinessLevelLabel(ReadinessLevelNovice)}
	}

	// 1. Competency average (40% weight)
	competencyAvg := computeCompetencyAvg(p.Competencies)

	// 2. Mock performance (30% weight)
	mockPerf := computeMockPerformance(p.Overview)

	// 3. Practice consistency (15% weight)
	consistency := computeConsistency(p.Overview)

	// 4. Checkpoint coverage (15% weight)
	checkpointCov := computeCheckpointCoverage(p.Checkpoints)

	score := int32(math.Round(
		competencyAvg*0.4 +
			mockPerf*0.3 +
			consistency*0.15 +
			checkpointCov*0.15,
	))
	if score > 100 {
		score = 100
	}
	if score < 0 {
		score = 0
	}

	level := ReadinessLevelFromScore(score)

	// Find weakest skill
	var weakestSkill *model.ProfileCompetency
	if len(p.Weakest) > 0 {
		weakestSkill = p.Weakest[0]
	}

	// Find strongest skill
	var strongestSkill *model.ProfileCompetency
	if len(p.Strongest) > 0 {
		strongestSkill = p.Strongest[0]
	}

	// Build next action
	nextAction := buildNextAction(p, weakestSkill)

	// Build company readiness
	companyReadiness := buildCompanyReadiness(p)

	return &model.Readiness{
		Score:            score,
		Level:            string(level),
		LevelLabel:       ReadinessLevelLabel(level),
		WeakestSkill:     weakestSkill,
		StrongestSkill:   strongestSkill,
		NextAction:       nextAction,
		CompanyReadiness: companyReadiness,
		StreakDays:       p.Overview.CurrentStreakDays,
		ActiveDays:       p.Overview.PracticeActiveDays,
	}
}

func computeCompetencyAvg(competencies []*model.ProfileCompetency) float64 {
	if len(competencies) == 0 {
		return 0
	}
	var sum float64
	var count int
	for _, c := range competencies {
		if c == nil {
			continue
		}
		if c.Score > 0 || c.PracticeSessions > 0 {
			sum += float64(c.Score)
			count++
		}
	}
	if count == 0 {
		return 0
	}
	return sum / float64(count)
}

func computeMockPerformance(ov model.ProfileProgressOverview) float64 {
	if ov.CompletedMockStages == 0 {
		return 0
	}
	// averageStageScore is 0-10, normalize to 0-100
	return math.Min(100, ov.AverageStageScore*10)
}

func computeConsistency(ov model.ProfileProgressOverview) float64 {
	// practiceActiveDays / 30 * 100, capped at 100
	return math.Min(100, float64(ov.PracticeActiveDays)/30.0*100)
}

func computeCheckpointCoverage(checkpoints []*model.ProfileCheckpointProgress) float64 {
	totalSkills := len(ProgressSkills)
	if totalSkills == 0 {
		return 0
	}
	passed := make(map[string]bool)
	for _, cp := range checkpoints {
		if cp != nil && cp.Score >= 50 {
			passed[cp.SkillKey] = true
		}
	}
	return float64(len(passed)) / float64(totalSkills) * 100
}

func buildNextAction(p *model.ProfileProgress, weakest *model.ProfileCompetency) *model.ReadinessNextAction {
	// Priority 1: No mock sessions at all → start a mock
	if p.Overview.CompletedMockStages == 0 && p.Overview.PracticeSessions >= 3 {
		return &model.ReadinessNextAction{
			Title:       "Пройди первый mock interview",
			Description: "У тебя уже есть базовая практика. Mock interview покажет реальный уровень.",
			ActionType:  "mock",
			ActionURL:   "/prepare/interview-prep",
			SkillKey:    "",
		}
	}

	// Priority 2: Weakest skill exists → practice it
	if weakest != nil && weakest.Score < 50 {
		href := RecommendationHref(weakest.Key)
		estGain := estimateGain(weakest)
		return &model.ReadinessNextAction{
			Title:       RecommendationTitle(weakest.Key, weakest.Label),
			Description: descriptionForWeakest(weakest, estGain),
			ActionType:  "practice",
			ActionURL:   href,
			SkillKey:    weakest.Key,
		}
	}

	// Priority 3: Has practice but no verified → checkpoint
	if weakest != nil && weakest.Confidence != "verified" && weakest.PracticeDays >= 3 {
		return &model.ReadinessNextAction{
			Title:       "Подтверди навык: " + weakest.Label,
			Description: "Practice volume набран — пройди checkpoint, чтобы зафиксировать результат.",
			ActionType:  "checkpoint",
			ActionURL:   "/prepare/interview-prep",
			SkillKey:    weakest.Key,
		}
	}

	// Priority 4: Strong overall → try arena for stress test
	if p.Overview.AverageStageScore >= 6.0 {
		return &model.ReadinessNextAction{
			Title:       "Проверь себя в дуэли",
			Description: "Твой средний скор высокий. Дуэль покажет, как ты работаешь под давлением.",
			ActionType:  "arena",
			ActionURL:   "/practice/arena",
			SkillKey:    "",
		}
	}

	// Default: practice more
	return &model.ReadinessNextAction{
		Title:       "Продолжай практику",
		Description: "Решай задачи каждый день — стабильность важнее скорости.",
		ActionType:  "practice",
		ActionURL:   "/practice/solo",
		SkillKey:    "",
	}
}

func estimateGain(weakest *model.ProfileCompetency) int32 {
	if weakest == nil {
		return 2
	}
	// Lower scores gain more from practice
	if weakest.Score < 20 {
		return 5
	}
	if weakest.Score < 40 {
		return 4
	}
	return 3
}

func descriptionForWeakest(c *model.ProfileCompetency, gain int32) string {
	if c == nil {
		return "Следующая тренировка даст заметный прирост."
	}
	return "Это поднимет твой общий скор примерно на " + itoa(gain) + " пунктов."
}

func itoa(n int32) string {
	if n < 0 {
		return "-" + itoa(-n)
	}
	if n < 10 {
		return string(rune('0' + n))
	}
	return itoa(n/10) + string(rune('0'+n%10))
}

func buildCompanyReadiness(p *model.ProfileProgress) []*model.CompanyReadiness {
	if len(p.Companies) == 0 && len(p.MockSessions) == 0 {
		return nil
	}

	byCompany := make(map[string]*model.CompanyReadiness)
	for _, name := range p.Companies {
		byCompany[name] = &model.CompanyReadiness{
			Company: name,
		}
	}

	for _, session := range p.MockSessions {
		if session == nil {
			continue
		}
		key := session.CompanyTag
		if key == "" {
			key = "Unknown"
		}
		cr, ok := byCompany[key]
		if !ok {
			cr = &model.CompanyReadiness{Company: key}
			byCompany[key] = cr
		}
		totalStages := session.TotalStages
		if totalStages < 1 {
			totalStages = 1
		}
		cr.TotalStages += totalStages
		if session.Status == "finished" {
			cr.CompletedStages += totalStages
		} else {
			cr.CompletedStages += session.CurrentStageIndex
		}
		if session.Status == "active" {
			cr.HasActive = true
		}
	}

	result := make([]*model.CompanyReadiness, 0, len(byCompany))
	for _, cr := range byCompany {
		denom := cr.TotalStages
		if denom < 1 {
			denom = 1
		}
		cr.Percent = int32(math.Min(100, math.Round(float64(cr.CompletedStages)/float64(denom)*100)))
		result = append(result, cr)
	}

	return result
}
