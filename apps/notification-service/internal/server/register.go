package server

import (
	"context"
	"encoding/json"

	"notification-service/internal/data"
	"notification-service/internal/service"
	v1 "notification-service/pkg/notification/v1"

	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/encoding/protojson"
)

type NotificationServer struct {
	v1.UnimplementedNotificationServiceServer
	svc *service.Service
}

func NewNotificationServer(svc *service.Service) *NotificationServer {
	return &NotificationServer{svc: svc}
}

func (s *NotificationServer) Send(ctx context.Context, req *v1.SendRequest) (*v1.SendResponse, error) {
	userID, err := uuid.Parse(req.GetUserId())
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "invalid user_id: %v", err)
	}

	var payload json.RawMessage
	if req.GetPayload() != nil {
		payload, err = protojson.Marshal(req.GetPayload())
		if err != nil {
			return nil, status.Errorf(codes.InvalidArgument, "invalid payload: %v", err)
		}
	}
	if payload == nil {
		payload = []byte("{}")
	}

	id, err := s.svc.Send(ctx, userID, req.GetKind(), req.GetTitle(), req.GetBody(), payload, nil)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "send: %v", err)
	}

	return &v1.SendResponse{NotificationId: id.String()}, nil
}

func (s *NotificationServer) SendBatch(ctx context.Context, req *v1.SendBatchRequest) (*v1.SendBatchResponse, error) {
	userIDs := make([]uuid.UUID, 0, len(req.GetUserIds()))
	for _, raw := range req.GetUserIds() {
		id, err := uuid.Parse(raw)
		if err != nil {
			return nil, status.Errorf(codes.InvalidArgument, "invalid user_id %q: %v", raw, err)
		}
		userIDs = append(userIDs, id)
	}

	var payload json.RawMessage
	var err error
	if req.GetPayload() != nil {
		payload, err = protojson.Marshal(req.GetPayload())
		if err != nil {
			return nil, status.Errorf(codes.InvalidArgument, "invalid payload: %v", err)
		}
	}
	if payload == nil {
		payload = []byte("{}")
	}

	count, err := s.svc.SendBatch(ctx, userIDs, req.GetKind(), req.GetTitle(), req.GetBody(), payload)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "send batch: %v", err)
	}

	return &v1.SendBatchResponse{Enqueued: int32(count)}, nil
}

func (s *NotificationServer) RegisterChat(ctx context.Context, req *v1.RegisterChatRequest) (*v1.RegisterChatResponse, error) {
	userID, err := uuid.Parse(req.GetUserId())
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "invalid user_id: %v", err)
	}

	if err := s.svc.RegisterChat(ctx, userID, req.GetTelegramChatId()); err != nil {
		return nil, status.Errorf(codes.Internal, "register chat: %v", err)
	}

	return &v1.RegisterChatResponse{}, nil
}

func (s *NotificationServer) LinkTelegram(ctx context.Context, req *v1.LinkTelegramRequest) (*v1.LinkTelegramResponse, error) {
	userID, err := uuid.Parse(req.GetUserId())
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "invalid user_id: %v", err)
	}

	if err := s.svc.LinkTelegram(ctx, userID, req.GetTelegramId()); err != nil {
		return nil, status.Errorf(codes.Internal, "link telegram: %v", err)
	}

	return &v1.LinkTelegramResponse{}, nil
}

func (s *NotificationServer) UpdateSettings(ctx context.Context, req *v1.UpdateSettingsRequest) (*v1.UpdateSettingsResponse, error) {
	userID, err := uuid.Parse(req.GetUserId())
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "invalid user_id: %v", err)
	}

	err = s.svc.UpdateSettings(ctx, userID, func(us *data.UserSettings) {
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

func (s *NotificationServer) GetSettings(ctx context.Context, req *v1.GetSettingsRequest) (*v1.GetSettingsResponse, error) {
	userID, err := uuid.Parse(req.GetUserId())
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "invalid user_id: %v", err)
	}

	settings, err := s.svc.GetSettings(ctx, userID)
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

func (s *NotificationServer) UpdateCircleSettings(ctx context.Context, req *v1.UpdateCircleSettingsRequest) (*v1.UpdateCircleSettingsResponse, error) {
	userID, err := uuid.Parse(req.GetUserId())
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "invalid user_id: %v", err)
	}
	circleID, err := uuid.Parse(req.GetCircleId())
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "invalid circle_id: %v", err)
	}

	err = s.svc.UpdateCircleSettings(ctx, userID, circleID, func(cs *data.CircleSettings) {
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
