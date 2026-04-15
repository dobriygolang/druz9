package notification

import (
	"context"

	v1 "notification-service/pkg/notification/v1"

	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func (i *Implementation) GetSettings(ctx context.Context, req *v1.GetSettingsRequest) (*v1.GetSettingsResponse, error) {
	userID, err := uuid.Parse(req.GetUserId())
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "invalid user_id: %v", err)
	}

	settings, err := i.service.GetSettings(ctx, userID)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "get settings: %v", err)
	}

	return &v1.GetSettingsResponse{
		DuelsEnabled:          settings.DuelsEnabled,
		ProgressEnabled:       settings.ProgressEnabled,
		CirclesEnabled:        settings.CirclesEnabled,
		DailyChallengeEnabled: settings.DailyChallengeEnabled,
		QuietHoursStart:       int32(settings.QuietHoursStart),
		QuietHoursEnd:         int32(settings.QuietHoursEnd),
		Timezone:              settings.Timezone,
		TelegramChatId:        settings.TelegramChatID,
	}, nil
}
