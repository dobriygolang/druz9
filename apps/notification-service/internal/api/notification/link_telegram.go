package notification

import (
	"context"

	v1 "notification-service/pkg/notification/v1"

	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func (i *Implementation) LinkTelegram(ctx context.Context, req *v1.LinkTelegramRequest) (*v1.LinkTelegramResponse, error) {
	userID, err := uuid.Parse(req.GetUserId())
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "invalid user_id: %v", err)
	}

	if err := i.service.LinkTelegram(ctx, userID, req.GetTelegramId()); err != nil {
		return nil, status.Errorf(codes.Internal, "link telegram: %v", err)
	}

	return &v1.LinkTelegramResponse{}, nil
}
