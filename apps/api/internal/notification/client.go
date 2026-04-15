package notification

import "context"

// Sender is the adapter interface for sending notifications.
// Domain/API layers depend on this interface, not on a specific transport.
type Sender interface {
	Send(ctx context.Context, userID, kind, title, body string, payload map[string]any)
	SendBatch(ctx context.Context, userIDs []string, kind, title, body string, payload map[string]any)
	RegisterChat(ctx context.Context, userID string, chatID int64)
}

// Noop is a no-op implementation used when notifications are disabled.
type Noop struct{}

func (Noop) Send(context.Context, string, string, string, string, map[string]any) {}
func (Noop) SendBatch(context.Context, []string, string, string, string, map[string]any) {}
func (Noop) RegisterChat(context.Context, string, int64) {}
