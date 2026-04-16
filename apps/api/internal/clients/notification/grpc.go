package notification

import (
	"context"
	"encoding/json"
	"fmt"

	v1 "api/pkg/api/notification/v1"

	klog "github.com/go-kratos/kratos/v2/log"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/protobuf/types/known/structpb"
)

// GRPCAdapter implements Sender via gRPC to the notification-service.
type GRPCAdapter struct {
	conn   *grpc.ClientConn
	client v1.NotificationServiceClient
}

// NewGRPCAdapter creates a gRPC adapter to the notification service.
func NewGRPCAdapter(addr string) (*GRPCAdapter, error) {
	conn, err := grpc.NewClient(addr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return nil, fmt.Errorf("connect notification service: %w", err)
	}
	return &GRPCAdapter{
		conn:   conn,
		client: v1.NewNotificationServiceClient(conn),
	}, nil
}

// Close closes the underlying gRPC connection.
func (a *GRPCAdapter) Close() error {
	if a.conn != nil {
		return a.conn.Close()
	}
	return nil
}

// Send enqueues a notification. Fire-and-forget: errors are logged.
func (a *GRPCAdapter) Send(ctx context.Context, userID, kind, title, body string, payload map[string]any) {
	pbPayload, err := toStruct(payload)
	if err != nil {
		klog.Errorf("notification payload marshal: %v", err)
		return
	}

	pbKind, ok := protoNotificationKind(kind)
	if !ok {
		klog.Errorf("notification send (user=%s): unknown kind %q", userID, kind)
		return
	}

	_, err = a.client.Send(ctx, &v1.SendRequest{
		UserId:  userID,
		Kind:    pbKind,
		Title:   title,
		Body:    body,
		Payload: pbPayload,
	})
	if err != nil {
		klog.Errorf("notification send (user=%s kind=%s): %v", userID, kind, err)
	}
}

// SendBatch enqueues notifications for multiple users. Fire-and-forget.
func (a *GRPCAdapter) SendBatch(ctx context.Context, userIDs []string, kind, title, body string, payload map[string]any) {
	if len(userIDs) == 0 {
		return
	}

	pbPayload, err := toStruct(payload)
	if err != nil {
		klog.Errorf("notification payload marshal: %v", err)
		return
	}

	pbKind, ok := protoNotificationKind(kind)
	if !ok {
		klog.Errorf("notification send batch: unknown kind %q", kind)
		return
	}

	_, err = a.client.SendBatch(ctx, &v1.SendBatchRequest{
		UserIds: userIDs,
		Kind:    pbKind,
		Title:   title,
		Body:    body,
		Payload: pbPayload,
	})
	if err != nil {
		klog.Errorf("notification send batch (kind=%s count=%d): %v", kind, len(userIDs), err)
	}
}

// RegisterChat links a Telegram chat ID to a user. Fire-and-forget.
func (a *GRPCAdapter) RegisterChat(ctx context.Context, userID string, chatID int64) {
	_, err := a.client.RegisterChat(ctx, &v1.RegisterChatRequest{
		UserId:         userID,
		TelegramChatId: chatID,
	})
	if err != nil {
		klog.Errorf("notification register chat (user=%s): %v", userID, err)
	}
}

// LinkTelegram links a telegram_id to a user UUID after login. Fire-and-forget.
func (a *GRPCAdapter) LinkTelegram(ctx context.Context, userID string, telegramID int64) {
	_, err := a.client.LinkTelegram(ctx, &v1.LinkTelegramRequest{
		UserId:     userID,
		TelegramId: telegramID,
	})
	if err != nil {
		klog.Errorf("notification link telegram (user=%s): %v", userID, err)
	}
}

// GetNotificationSettings fetches notification preferences for a user.
func (a *GRPCAdapter) GetNotificationSettings(ctx context.Context, userID string) (*Settings, error) {
	resp, err := a.client.GetSettings(ctx, &v1.GetSettingsRequest{UserId: userID})
	if err != nil {
		return nil, err
	}
	return &Settings{
		DuelsEnabled:          resp.GetDuelsEnabled(),
		ProgressEnabled:       resp.GetProgressEnabled(),
		CirclesEnabled:        resp.GetCirclesEnabled(),
		DailyChallengeEnabled: resp.GetDailyChallengeEnabled(),
		QuietHoursStart:       resp.GetQuietHoursStart(),
		QuietHoursEnd:         resp.GetQuietHoursEnd(),
		Timezone:              resp.GetTimezone(),
		TelegramLinked:        resp.GetTelegramChatId() != 0,
	}, nil
}

// UpdateNotificationSettings applies partial setting changes for a user.
func (a *GRPCAdapter) UpdateNotificationSettings(ctx context.Context, userID string, upd SettingsUpdate) error {
	req := &v1.UpdateSettingsRequest{UserId: userID}
	req.DuelsEnabled = upd.DuelsEnabled
	req.ProgressEnabled = upd.ProgressEnabled
	req.CirclesEnabled = upd.CirclesEnabled
	req.DailyChallengeEnabled = upd.DailyChallengeEnabled
	_, err := a.client.UpdateSettings(ctx, req)
	return err
}

func toStruct(m map[string]any) (*structpb.Struct, error) {
	if m == nil {
		return nil, nil
	}
	data, err := json.Marshal(m)
	if err != nil {
		return nil, err
	}
	s := &structpb.Struct{}
	if err := s.UnmarshalJSON(data); err != nil {
		return nil, err
	}
	return s, nil
}
