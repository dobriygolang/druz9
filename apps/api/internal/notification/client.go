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

// Client wraps the gRPC notification service client.
// All methods are fire-and-forget: errors are logged but not returned to callers.
type Client struct {
	conn   *grpc.ClientConn
	client v1.NotificationServiceClient
}

// NewClient creates a gRPC client connection to the notification service.
// Returns a noop client if addr is empty (service not configured).
func NewClient(addr string) (*Client, error) {
	if addr == "" {
		klog.Warn("notification service address not configured, notifications disabled")
		return &Client{}, nil
	}

	conn, err := grpc.NewClient(addr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return nil, fmt.Errorf("connect notification service: %w", err)
	}

	return &Client{
		conn:   conn,
		client: v1.NewNotificationServiceClient(conn),
	}, nil
}

// Close closes the underlying gRPC connection.
func (c *Client) Close() error {
	if c.conn != nil {
		return c.conn.Close()
	}
	return nil
}

// Enabled returns true if the client is connected.
func (c *Client) Enabled() bool {
	return c.client != nil
}

// Send enqueues a notification. Fire-and-forget.
func (c *Client) Send(ctx context.Context, userID, kind, title, body string, payload map[string]any) {
	if !c.Enabled() {
		return
	}

	pbPayload, err := toStruct(payload)
	if err != nil {
		klog.Errorf("notification payload marshal: %v", err)
		return
	}

	_, err = c.client.Send(ctx, &v1.SendRequest{
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
func (c *Client) SendBatch(ctx context.Context, userIDs []string, kind, title, body string, payload map[string]any) {
	if !c.Enabled() || len(userIDs) == 0 {
		return
	}

	pbPayload, err := toStruct(payload)
	if err != nil {
		klog.Errorf("notification payload marshal: %v", err)
		return
	}

	_, err = c.client.SendBatch(ctx, &v1.SendBatchRequest{
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
func (c *Client) RegisterChat(ctx context.Context, userID string, chatID int64) {
	if !c.Enabled() {
		return
	}

	_, err := c.client.RegisterChat(ctx, &v1.RegisterChatRequest{
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
	// Convert through JSON to handle nested types safely.
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
