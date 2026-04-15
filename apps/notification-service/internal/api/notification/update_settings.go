package notification

import (
	"context"

	"notification-service/internal/data"
	v1 "notification-service/pkg/notification/v1"

	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func (i *Implementation) UpdateSettings(ctx context.Context, req *v1.UpdateSettingsRequest) (*v1.UpdateSettingsResponse, error) {
	userID, err := uuid.Parse(req.GetUserId())
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "invalid user_id: %v", err)
	}

	err = i.service.UpdateSettings(ctx, userID, func(us *data.UserSettings) {
		if req.DuelsEnabled != nil {
			us.DuelsEnabled = *req.DuelsEnabled
		}
		if req.ProgressEnabled != nil {
			us.ProgressEnabled = *req.ProgressEnabled
		}
		if req.CirclesEnabled != nil {
			us.CirclesEnabled = *req.CirclesEnabled
		}
		if req.DailyChallengeEnabled != nil {
			us.DailyChallengeEnabled = *req.DailyChallengeEnabled
		}
		if req.QuietHoursStart != nil {
			us.QuietHoursStart = int(*req.QuietHoursStart)
		}
		if req.QuietHoursEnd != nil {
			us.QuietHoursEnd = int(*req.QuietHoursEnd)
		}
		if req.Timezone != nil {
			us.Timezone = *req.Timezone
		}
	})
	if err != nil {
		return nil, status.Errorf(codes.Internal, "update settings: %v", err)
	}

	return &v1.UpdateSettingsResponse{}, nil
}
