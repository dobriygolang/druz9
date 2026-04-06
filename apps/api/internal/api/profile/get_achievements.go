package profile

import (
	"context"

	"api/internal/domain/achievement"
	v1 "api/pkg/api/profile/v1"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

// GetAchievements stub. Please implement it.
func (i *Implementation) GetAchievements(ctx context.Context, req *v1.GetAchievementsRequest) (*v1.GetAchievementsResponse, error) {
	userID, err := uuid.Parse(req.UserId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_USER_ID", "invalid user id")
	}
	progress, err := i.progressRepo.GetProfileProgress(ctx, userID)
	if err != nil {
		return nil, err
	}
	ov := progress.Overview
	items := achievement.Compute(ov.PracticeSessions, ov.PracticePassedSessions, ov.CompletedMockSessions, ov.CurrentStreakDays)
	out := make([]*v1.Achievement, 0, len(items))
	for _, a := range items {
		out = append(out, &v1.Achievement{
			Id:          a.ID,
			Title:       a.Title,
			Description: a.Description,
			Icon:        a.Icon,
			Unlocked:    a.Unlocked,
			Category:    a.Category,
		})
	}
	return &v1.GetAchievementsResponse{Achievements: out}, nil
}
