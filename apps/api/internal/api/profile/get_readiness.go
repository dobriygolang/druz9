package profile

import (
	"context"
	"fmt"

	"api/internal/apihelpers"
	profiledomain "api/internal/domain/profile"
	"api/internal/model"
	v1 "api/pkg/api/profile/v1"
)

func (i *Implementation) GetReadiness(ctx context.Context, req *v1.GetReadinessRequest) (*v1.GetReadinessResponse, error) {
	userID, err := apihelpers.ParseUUID(req.GetUserId(), "INVALID_USER_ID", "user_id")
	if err != nil {
		return nil, fmt.Errorf("parse user_id: %w", err)
	}

	progress, err := i.progressRepo.GetProfileProgress(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("get profile progress: %w", err)
	}

	readiness := profiledomain.ComputeReadiness(progress)

	resp := &v1.GetReadinessResponse{
		Score:      readiness.Score,
		Level:      mapReadinessLevel(readiness.Level),
		LevelLabel: readiness.LevelLabel,
		StreakDays: readiness.StreakDays,
		ActiveDays: readiness.ActiveDays,
	}

	if readiness.WeakestSkill != nil {
		resp.WeakestSkill = mapReadinessCompetency(readiness.WeakestSkill)
	}
	if readiness.StrongestSkill != nil {
		resp.StrongestSkill = mapReadinessCompetency(readiness.StrongestSkill)
	}
	if readiness.NextAction != nil {
		resp.NextAction = &v1.ReadinessNextAction{
			Title:       readiness.NextAction.Title,
			Description: readiness.NextAction.Description,
			ActionType:  mapProfileActionType(readiness.NextAction.ActionType),
			ActionUrl:   readiness.NextAction.ActionURL,
			SkillKey:    readiness.NextAction.SkillKey,
		}
	}

	if len(readiness.CompanyReadiness) > 0 {
		cr := make([]*v1.CompanyReadiness, 0, len(readiness.CompanyReadiness))
		for _, c := range readiness.CompanyReadiness {
			if c == nil {
				continue
			}
			cr = append(cr, &v1.CompanyReadiness{
				Company:         c.Company,
				TotalStages:     c.TotalStages,
				CompletedStages: c.CompletedStages,
				Percent:         c.Percent,
				HasActive:       c.HasActive,
			})
		}
		resp.CompanyReadiness = cr
	}

	return resp, nil
}

func mapReadinessCompetency(c *model.ProfileCompetency) *v1.ProfileCompetency {
	if c == nil {
		return nil
	}
	return mapCompetency(c)
}
