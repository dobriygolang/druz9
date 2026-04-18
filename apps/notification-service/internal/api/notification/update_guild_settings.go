package notification

import (
	"context"

	"notification-service/internal/data"
	v1 "notification-service/pkg/notification/v1"

	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func (i *Implementation) UpdateGuildSettings(ctx context.Context, req *v1.UpdateGuildSettingsRequest) (*v1.UpdateGuildSettingsResponse, error) {
	userID, err := uuid.Parse(req.GetUserId())
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "invalid user_id: %v", err)
	}
	guildID, err := uuid.Parse(req.GetGuildId())
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "invalid guild_id: %v", err)
	}

	err = i.service.UpdateGuildSettings(ctx, userID, guildID, func(cs *data.GuildSettings) {
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
		return nil, status.Errorf(codes.Internal, "update guild settings: %v", err)
	}

	return &v1.UpdateGuildSettingsResponse{}, nil
}
