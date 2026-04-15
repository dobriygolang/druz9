package notification

import (
	"context"

	v1 "notification-service/pkg/notification/v1"

	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func (i *Implementation) RegisterChat(ctx context.Context, req *v1.RegisterChatRequest) (*v1.RegisterChatResponse, error) {
	userID, err := uuid.Parse(req.GetUserId())
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "invalid user_id: %v", err)
	}

	if err := i.service.RegisterChat(ctx, userID, req.GetTelegramChatId()); err != nil {
		return nil, status.Errorf(codes.Internal, "register chat: %v", err)
	}

	return &v1.RegisterChatResponse{}, nil
}
