package notification

import "context"

// Settings holds a user's notification preferences returned by GetNotificationSettings.
type Settings struct {
	DuelsEnabled          bool
	ProgressEnabled       bool
	CirclesEnabled        bool
	DailyChallengeEnabled bool
	QuietHoursStart       int32
	QuietHoursEnd         int32
	Timezone              string
	TelegramLinked        bool
}

// SettingsUpdate carries partial updates for UpdateNotificationSettings.
// Only non-nil fields are applied.
type SettingsUpdate struct {
	DuelsEnabled          *bool
	ProgressEnabled       *bool
	CirclesEnabled        *bool
	DailyChallengeEnabled *bool
}

// Sender is the adapter interface for sending notifications and managing settings.
// Domain/API layers depend on this interface, not on a specific transport.
type Sender interface {
	Send(ctx context.Context, userID, kind, title, body string, payload map[string]any)
	SendBatch(ctx context.Context, userIDs []string, kind, title, body string, payload map[string]any)
	RegisterChat(ctx context.Context, userID string, chatID int64)
	LinkTelegram(ctx context.Context, userID string, telegramID int64)
	GetNotificationSettings(ctx context.Context, userID string) (*Settings, error)
	UpdateNotificationSettings(ctx context.Context, userID string, upd SettingsUpdate) error
}

// Noop is a no-op implementation used when notifications are disabled.
type Noop struct{}

func (Noop) Send(context.Context, string, string, string, string, map[string]any)        {}
func (Noop) SendBatch(context.Context, []string, string, string, string, map[string]any) {}
func (Noop) RegisterChat(context.Context, string, int64)                                 {}
func (Noop) LinkTelegram(context.Context, string, int64)                                 {}
func (Noop) GetNotificationSettings(_ context.Context, _ string) (*Settings, error) {
	return &Settings{
		DuelsEnabled:    true,
		ProgressEnabled: true,
		CirclesEnabled:  true,
	}, nil
}
func (Noop) UpdateNotificationSettings(context.Context, string, SettingsUpdate) error { return nil }
