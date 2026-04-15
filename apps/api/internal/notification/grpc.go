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

	_, err = a.client.Send(ctx, &v1.SendRequest{
		UserId:  userID,
		Kind:    kind,
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

	_, err = a.client.SendBatch(ctx, &v1.SendBatchRequest{
		UserIds: userIDs,
		Kind:    kind,
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
