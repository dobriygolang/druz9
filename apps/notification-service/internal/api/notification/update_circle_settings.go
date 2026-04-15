package notification

import (
	"context"

	"notification-service/internal/data"
	v1 "notification-service/pkg/notification/v1"

	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func (i *Implementation) UpdateCircleSettings(ctx context.Context, req *v1.UpdateCircleSettingsRequest) (*v1.UpdateCircleSettingsResponse, error) {
	userID, err := uuid.Parse(req.GetUserId())
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "invalid user_id: %v", err)
	}
	circleID, err := uuid.Parse(req.GetCircleId())
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "invalid circle_id: %v", err)
	}

	err = i.service.UpdateCircleSettings(ctx, userID, circleID, func(cs *data.CircleSettings) {
		if req.EventsEnabled != nil {
			cs.EventsEnabled = *req.EventsEnabled
		}
		if req.ActivityEnabled != nil {
			cs.ActivityEnabled = *req.ActivityEnabled
		}
		if req.DigestEnabled != nil {
			cs.DigestEnabled = *req.DigestEnabled
		}
		if req.Muted != nil {
			cs.Muted = *req.Muted
		}
	})
	if err != nil {
		return nil, status.Errorf(codes.Internal, "update circle settings: %v", err)
	}

	return &v1.UpdateCircleSettingsResponse{}, nil
}
