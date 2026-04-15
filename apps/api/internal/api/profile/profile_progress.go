package profile

import (
	"api/internal/model"
	v1 "api/pkg/api/profile/v1"

	"google.golang.org/protobuf/types/known/timestamppb"
)

func mapProfileProgress(p *model.ProfileProgress) *v1.ProfileProgress {
	if p == nil {
		return &v1.ProfileProgress{}
	}
	ov := p.Overview
	overview := &v1.ProfileProgressOverview{
		PracticeSessions:       ov.PracticeSessions,
		PracticePassedSessions: ov.PracticePassedSessions,
		PracticeActiveDays:     ov.PracticeActiveDays,
		CompletedMockSessions:  ov.CompletedMockSessions,
		CompletedMockStages:    ov.CompletedMockStages,
		AnsweredQuestions:      ov.AnsweredQuestions,
		AverageStageScore:      ov.AverageStageScore,
		AverageQuestionScore:   ov.AverageQuestionScore,
		CurrentStreakDays:      ov.CurrentStreakDays,
	}
	if ov.LastActivityAt != nil {
		overview.LastActivityAt = timestamppb.New(*ov.LastActivityAt)
	}

	mapCompetency := func(c *model.ProfileCompetency) *v1.ProfileCompetency {
		if c == nil {
			return nil
		}
		return &v1.ProfileCompetency{
			Key:                    c.Key,
			Label:                  c.Label,
			Score:                  c.Score,
			PracticeScore:          c.PracticeScore,
			VerifiedScore:          c.VerifiedScore,
			StageCount:             c.StageCount,
			QuestionCount:          c.QuestionCount,
			PracticeSessions:       c.PracticeSessions,
			PracticePassedSessions: c.PracticePassedSessions,
			PracticeDays:           c.PracticeDays,
			Confidence:             c.Confidence,
			AverageScore:           c.AverageScore,
			Level:                  c.Level,
			LevelProgress:          c.LevelProgress,
			NextMilestone:          c.NextMilestone,
		}
	}

	competencies := make([]*v1.ProfileCompetency, 0, len(p.Competencies))
	for _, c := range p.Competencies {
		competencies = append(competencies, mapCompetency(c))
	}
	strongest := make([]*v1.ProfileCompetency, 0, len(p.Strongest))
	for _, c := range p.Strongest {
		strongest = append(strongest, mapCompetency(c))
	}
	weakest := make([]*v1.ProfileCompetency, 0, len(p.Weakest))
	for _, c := range p.Weakest {
		weakest = append(weakest, mapCompetency(c))
	}

	recommendations := make([]*v1.ProfileProgressRecommendation, 0, len(p.Recommendations))
	for _, r := range p.Recommendations {
		if r == nil {
			continue
		}
		recommendations = append(recommendations, &v1.ProfileProgressRecommendation{
			Key:         r.Key,
			Title:       r.Title,
			Description: r.Description,
			Href:        r.Href,
		})
	}

	checkpoints := make([]*v1.ProfileCheckpointProgress, 0, len(p.Checkpoints))
	for _, cp := range p.Checkpoints {
		if cp == nil {
			continue
		}
		item := &v1.ProfileCheckpointProgress{
			Id:         cp.ID,
			TaskId:     cp.TaskID,
			TaskTitle:  cp.TaskTitle,
			SkillKey:   cp.SkillKey,
			SkillLabel: cp.SkillLabel,
			Score:      cp.Score,
		}
		if cp.FinishedAt != nil {
			item.FinishedAt = timestamppb.New(*cp.FinishedAt)
		}
		checkpoints = append(checkpoints, item)
	}

	nextActions := make([]*v1.NextAction, 0, len(p.NextActions))
	for _, na := range p.NextActions {
		if na == nil {
			continue
		}
		nextActions = append(nextActions, &v1.NextAction{
			Title:       na.Title,
			Description: na.Description,
			ActionType:  na.ActionType,
			ActionUrl:   na.ActionURL,
			Priority:    na.Priority,
			SkillKey:    na.SkillKey,
		})
	}

	var goal *v1.UserGoal
	if p.Goal != nil {
		goal = &v1.UserGoal{
			Kind:    p.Goal.Kind,
			Company: p.Goal.Company,
		}
	}

	return &v1.ProfileProgress{
		Overview:        overview,
		Competencies:    competencies,
		Strongest:       strongest,
		Weakest:         weakest,
		Recommendations: recommendations,
		Checkpoints:     checkpoints,
		Companies:       p.Companies,
		NextActions:     nextActions,
		Goal:            goal,
	}
}
