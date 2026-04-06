package profile

import (
	"context"

	"api/internal/domain/activity"
	v1 "api/pkg/api/profile/v1"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

// GetProfileActivity stub. Please implement it.
func (i *Implementation) GetProfileActivity(ctx context.Context, req *v1.GetProfileActivityRequest) (*v1.GetProfileActivityResponse, error) {
	userID, err := uuid.Parse(req.UserId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_USER_ID", "invalid user id")
	}
	progress, err := i.progressRepo.GetProfileProgress(ctx, userID)
	if err != nil {
		return nil, err
	}
	ov := progress.Overview
	days := activity.Generate(userID, int(ov.PracticeSessions), int(ov.CurrentStreakDays))
	out := make([]*v1.ActivityDay, 0, len(days))
	for _, d := range days {
		out = append(out, &v1.ActivityDay{Date: d.Date, Count: int32(d.Count)})
	}
	return &v1.GetProfileActivityResponse{Activity: out}, nil
}
