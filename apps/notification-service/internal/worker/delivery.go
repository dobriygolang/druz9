package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"notification-service/internal/data"
	"notification-service/internal/service"
	"notification-service/internal/telegram"

	"github.com/google/uuid"
	klog "github.com/go-kratos/kratos/v2/log"
)

const (
	pollInterval    = 5 * time.Second
	batchSize       = 10
	maxRetryBackoff = 60 * time.Second
)

type DeliveryWorker struct {
	repo     *data.Repo
	tg       *telegram.Client
	svc      *service.Service
}

func NewDeliveryWorker(repo *data.Repo, tg *telegram.Client, svc *service.Service) *DeliveryWorker {
	return &DeliveryWorker{
		repo: repo,
		tg:   tg,
		svc:  svc,
	}
}

// Run starts count delivery goroutines. Blocks until ctx is cancelled.
func (w *DeliveryWorker) Run(ctx context.Context, count int) {
	for i := 0; i < count; i++ {
		go w.loop(ctx, i)
	}
	klog.Infof("started %d delivery workers", count)
	<-ctx.Done()
}

func (w *DeliveryWorker) loop(ctx context.Context, workerID int) {
	backoff := time.Duration(0)

	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		if backoff > 0 {
			select {
			case <-ctx.Done():
				return
			case <-time.After(backoff):
			}
			backoff = 0
		}

		batch, err := w.repo.FetchPending(ctx, batchSize)
		if err != nil {
			if ctx.Err() != nil {
				return
			}
			klog.Errorf("worker[%d] fetch pending: %v", workerID, err)
			backoff = pollInterval
			continue
		}

		if len(batch) == 0 {
			select {
			case <-ctx.Done():
				return
			case <-time.After(pollInterval):
			}
			continue
		}

		for _, n := range batch {
			if ctx.Err() != nil {
				return
			}
			if err := w.deliver(ctx, n); err != nil {
				klog.Errorf("worker[%d] deliver %s: %v", workerID, n.ID, err)
				// Back off on rate limit.
				if isRateLimitError(err) {
					backoff = min(backoff*2+time.Second, maxRetryBackoff)
				}
			}
		}
	}
}

func (w *DeliveryWorker) deliver(ctx context.Context, n *data.Notification) error {
	settings, err := w.svc.GetSettings(ctx, n.UserID)
	if err != nil {
		return w.markFailed(ctx, n.ID, fmt.Sprintf("get settings: %v", err))
	}

	dailyCount, err := w.repo.DailyCountForUser(ctx, n.UserID)
	if err != nil {
		return w.markFailed(ctx, n.ID, fmt.Sprintf("daily count: %v", err))
	}

	// Get guild settings if this is a guild notification.
	var guildSettings *data.GuildSettings
	if service.IsGuildKind(n.Kind) {
		guildID := extractGuildID(n.Payload)
		if guildID != uuid.Nil {
			cs, csErr := w.repo.GetGuildSettings(ctx, n.UserID, guildID)
			if csErr != nil {
				klog.Warnf("worker get guild settings: %v", csErr)
			} else {
				guildSettings = cs
			}
		}
	}

	result := service.ShouldDeliver(n, settings, dailyCount, guildSettings)

	switch result {
	case service.FilterDrop:
		reason := "filtered"
		if settings.TelegramChatID == 0 {
			reason = "no_telegram_chat_id"
		}
		return w.repo.MarkFailed(ctx, n.ID, reason)
	case service.FilterReschedule:
		rescheduleAt := service.QuietHoursEndTime(settings)
		return w.repo.Reschedule(ctx, n.ID, rescheduleAt)
	}

	// Deliver via Telegram — with inline keyboard for specific kinds.
	keyboard := buildKeyboard(n)
	var sendErr error
	if keyboard != nil {
		sendErr = w.tg.SendMessageWithKeyboard(ctx, settings.TelegramChatID, n.Body, *keyboard)
	} else {
		sendErr = w.tg.SendMessage(ctx, settings.TelegramChatID, n.Body)
	}
	if sendErr != nil {
		return w.markFailed(ctx, n.ID, sendErr.Error())
	}

	return w.repo.MarkSent(ctx, n.ID)
}

func (w *DeliveryWorker) markFailed(ctx context.Context, id uuid.UUID, errMsg string) error {
	if err := w.repo.MarkFailed(ctx, id, errMsg); err != nil {
		klog.Errorf("mark failed %s: %v", id, err)
	}
	return fmt.Errorf("%s", errMsg)
}

func buildKeyboard(n *data.Notification) *telegram.InlineKeyboardMarkup {
	switch n.Kind {
	case service.KindDuelInvite:
		matchID := extractStringField(n.Payload, "match_id")
		if matchID == "" {
			return nil
		}
		return &telegram.InlineKeyboardMarkup{
			InlineKeyboard: [][]telegram.InlineKeyboardButton{
				{
					{Text: "Принять", URL: "https://druz9.online/arena/" + matchID},
				},
			},
		}
	case service.KindGuildInvite:
		guildID := extractStringField(n.Payload, "guild_id")
		if guildID == "" {
			return nil
		}
		return &telegram.InlineKeyboardMarkup{
			InlineKeyboard: [][]telegram.InlineKeyboardButton{
				{
					{Text: "Открыть круг", URL: "https://druz9.online/guilds/" + guildID},
				},
			},
		}
	case service.KindDuelMatchFound:
		matchID := extractStringField(n.Payload, "match_id")
		if matchID == "" {
			return nil
		}
		return &telegram.InlineKeyboardMarkup{
			InlineKeyboard: [][]telegram.InlineKeyboardButton{
				{
					{Text: "К матчу", URL: "https://druz9.online/arena/" + matchID},
				},
			},
		}
	default:
		return nil
	}
}

func extractStringField(payload []byte, field string) string {
	if len(payload) == 0 {
		return ""
	}
	var m map[string]any
	if err := json.Unmarshal(payload, &m); err != nil {
		return ""
	}
	v, _ := m[field].(string)
	return v
}

func extractGuildID(payload []byte) uuid.UUID {
	if len(payload) == 0 {
		return uuid.Nil
	}
	var p struct {
		GuildID string `json:"guild_id"`
	}
	if err := json.Unmarshal(payload, &p); err != nil {
		return uuid.Nil
	}
	id, err := uuid.Parse(p.GuildID)
	if err != nil {
		return uuid.Nil
	}
	return id
}

func isRateLimitError(err error) bool {
	if err == nil {
		return false
	}
	return err.Error() == "telegram rate limited (429)"
}
