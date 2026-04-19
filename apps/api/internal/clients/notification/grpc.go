package notification

import (
	"context"
	"fmt"

	klog "github.com/go-kratos/kratos/v2/log"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	v1 "api/pkg/api/notification/v1"
)

// GRPCAdapter implements Sender via gRPC to the notification-service.
type GRPCAdapter struct {
	conn   *grpc.ClientConn
	client v1.NotificationServiceClient
}

// NewGRPCAdapter creates a gRPC adapter to the notification service.
func NewGRPCAdapter(addr string) (*GRPCAdapter, error) {
	conn, err := grpc.NewClient(
		addr,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
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
		if err := a.conn.Close(); err != nil {
			return fmt.Errorf("close connection: %w", err)
		}
	}
	return nil
}

// Send enqueues a notification. Fire-and-forget: errors are logged.
// Payload used to be a free-form map — it's now a typed
// NotificationPayload (see notification.proto). Callers pass the same
// map[string]any they had before; it's converted here.
func (a *GRPCAdapter) Send(ctx context.Context, userID, kind, title, body string, payload map[string]any) {
	pbKind, ok := protoNotificationKind(kind)
	if !ok {
		klog.Errorf("notification send (user=%s): unknown kind %q", userID, kind)
		return
	}

	_, err := a.client.Send(ctx, &v1.SendRequest{
		UserId:  userID,
		Kind:    pbKind,
		Title:   title,
		Body:    body,
		Payload: buildPayload(payload),
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

	pbKind, ok := protoNotificationKind(kind)
	if !ok {
		klog.Errorf("notification send batch: unknown kind %q", kind)
		return
	}

	_, err := a.client.SendBatch(ctx, &v1.SendBatchRequest{
		UserIds: userIDs,
		Kind:    pbKind,
		Title:   title,
		Body:    body,
		Payload: buildPayload(payload),
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
		return nil, fmt.Errorf("get settings: %w", err)
	}
	return &Settings{
		DuelsEnabled:          resp.GetDuelsEnabled(),
		ProgressEnabled:       resp.GetProgressEnabled(),
		GuildsEnabled:         resp.GetGuildsEnabled(),
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
	req.GuildsEnabled = upd.GuildsEnabled
	req.DailyChallengeEnabled = upd.DailyChallengeEnabled
	_, err := a.client.UpdateSettings(ctx, req)
	if err != nil {
		return fmt.Errorf("update settings: %w", err)
	}
	return nil
}

// buildPayload copies well-known deep-link keys from the legacy
// map[string]any callsites into the typed NotificationPayload. Unknown
// keys are dropped with a warning — this is intentional: if a new key
// is needed, add it to the proto message first so the contract stays
// the source of truth.
func buildPayload(m map[string]any) *v1.NotificationPayload {
	if len(m) == 0 {
		return nil
	}
	p := &v1.NotificationPayload{}
	for k, v := range m {
		switch k {
		case "match_id":
			p.MatchId, _ = v.(string)
		case "topic":
			p.Topic, _ = v.(string)
		case "is_winner":
			p.IsWinner, _ = v.(bool)
		case "session_id":
			p.SessionId, _ = v.(string)
		case "blueprint_title":
			p.BlueprintTitle, _ = v.(string)
		case "company_tag":
			p.CompanyTag, _ = v.(string)
		case "guild_id":
			p.GuildId, _ = v.(string)
		case "inviter_id":
			p.InviterId, _ = v.(string)
		case "challenge_id":
			p.ChallengeId, _ = v.(string)
		case "template_key":
			p.TemplateKey, _ = v.(string)
		case "target_value":
			switch x := v.(type) {
			case int64:
				p.TargetValue = x
			case int32:
				p.TargetValue = int64(x)
			case int:
				p.TargetValue = int64(x)
			}
		case "event_id":
			p.EventId, _ = v.(string)
		default:
			klog.Warnf("notification payload: dropping unknown key %q (add it to NotificationPayload in the proto first)", k)
		}
	}
	return p
}
