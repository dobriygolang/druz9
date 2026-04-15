package bot

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"notification-service/internal/data"
	"notification-service/internal/service"
	"notification-service/internal/telegram"

	klog "github.com/go-kratos/kratos/v2/log"
)

const apiBase = "https://api.telegram.org"

// AuthConfirmer is called back to the API service for /start auth flow.
type AuthConfirmer interface {
	ConfirmTelegramAuth(ctx context.Context, token string, telegramID int64, firstName, lastName, username, photoURL string) (loginCode string, err error)
}

type Bot struct {
	httpClient *http.Client
	token      string
	tg         *telegram.Client
	svc        *service.Service
	repo       *data.Repo
	auth       AuthConfirmer
}

func New(token string, tg *telegram.Client, svc *service.Service, repo *data.Repo, auth AuthConfirmer) *Bot {
	return &Bot{
		httpClient: &http.Client{Timeout: 70 * time.Second},
		token:      strings.TrimSpace(token),
		tg:         tg,
		svc:        svc,
		repo:       repo,
		auth:       auth,
	}
}

func (b *Bot) Enabled() bool {
	return b != nil && b.token != ""
}

func (b *Bot) Run(ctx context.Context) error {
	if !b.Enabled() {
		return nil
	}
	// Clear any existing webhook to enable long polling.
	_ = b.callAPI(ctx, "deleteWebhook", map[string]any{"drop_pending_updates": false})

	var offset int64
	for {
		select {
		case <-ctx.Done():
			return nil
		default:
		}

		updates, err := b.getUpdates(ctx, offset)
		if err != nil {
			if ctx.Err() != nil {
				return nil
			}
			klog.Errorf("bot getUpdates: %v", err)
			select {
			case <-ctx.Done():
				return nil
			case <-time.After(3 * time.Second):
				continue
			}
		}

		for _, update := range updates {
			offset = update.UpdateID + 1
			b.safeHandleUpdate(ctx, update)
		}
	}
}

func (b *Bot) safeHandleUpdate(ctx context.Context, update telegramUpdate) {
	defer func() {
		if recovered := recover(); recovered != nil {
			klog.Errorf("bot handleUpdate panic: %v", recovered)
		}
	}()
	b.handleUpdate(ctx, update)
}

func (b *Bot) handleUpdate(ctx context.Context, update telegramUpdate) {
	if update.CallbackQuery != nil {
		b.handleCallback(ctx, update.CallbackQuery)
		return
	}
	if update.Message == nil || update.Message.From == nil || update.Message.From.IsBot {
		return
	}

	command, token := parseCommand(update.Message.Text)
	if command == "" {
		return
	}

	switch command {
	case "/start":
		b.handleStart(ctx, update.Message, token)
	case "/settings":
		b.handleSettings(ctx, update.Message)
	case "/stop":
		b.handleStop(ctx, update.Message)
	}
}

func (b *Bot) handleStart(ctx context.Context, msg *telegramMessage, token string) {
	if token == "" {
		b.sendMessage(ctx, msg.Chat.ID, "Привет! Я бот druz9.\n\nДля входа перейди на сайт и нажми «Войти через Telegram».")
		return
	}

	if b.auth == nil {
		b.sendMessage(ctx, msg.Chat.ID, "Auth service не настроен.")
		return
	}

	code, err := b.auth.ConfirmTelegramAuth(ctx, token, msg.From.ID, msg.From.FirstName, msg.From.LastName, msg.From.Username, "")
	if err != nil {
		klog.Errorf("bot confirm auth: %v", err)
		b.sendMessage(ctx, msg.Chat.ID, "Не удалось подтвердить вход. Вернись в приложение и попробуй ещё раз.")
		return
	}

	b.sendMessage(ctx, msg.Chat.ID, fmt.Sprintf("Код входа: %s\n\nВернись на сайт и введи его в форме авторизации.", code))

	// Register chat_id for future notifications. The user_id will be linked after login.
	if err := b.repo.RegisterChatByTelegramID(ctx, msg.From.ID, msg.Chat.ID); err != nil {
		klog.Errorf("bot: register chat: %v", err)
	}
	klog.Infof("bot: auth confirmed for telegram_id=%d chat_id=%d", msg.From.ID, msg.Chat.ID)
}

func (b *Bot) handleSettings(ctx context.Context, msg *telegramMessage) {
	b.sendMessage(ctx, msg.Chat.ID,
		"Настройки уведомлений:\n\n"+
			"Управляй уведомлениями в профиле на сайте.\n"+
			"Чтобы отключить все уведомления, отправь /stop")
}

func (b *Bot) handleStop(ctx context.Context, msg *telegramMessage) {
	b.sendMessage(ctx, msg.Chat.ID, "Уведомления отключены. Чтобы включить снова, напиши /start")
}

func (b *Bot) handleCallback(ctx context.Context, cb *telegramCallback) {
	// Answer callback to remove loading indicator.
	_ = b.callAPI(ctx, "answerCallbackQuery", map[string]any{"callback_query_id": cb.ID})

	parts := strings.SplitN(cb.Data, ":", 2)
	if len(parts) < 2 {
		return
	}

	switch parts[0] {
	case "mute":
		// mute:<circle_id> — mute circle notifications
		klog.Infof("bot: mute circle %s for user %d", parts[1], cb.From.ID)
	}
}

// ── Telegram API helpers ──────────────────────────────────────

type apiResponse[T any] struct {
	OK     bool   `json:"ok"`
	Result T      `json:"result"`
	Error  string `json:"description"`
}

func (b *Bot) getUpdates(ctx context.Context, offset int64) ([]telegramUpdate, error) {
	reqBody := map[string]any{
		"offset":          offset,
		"timeout":         50,
		"allowed_updates": []string{"message", "callback_query"},
	}

	var resp apiResponse[[]telegramUpdate]
	if err := b.callAndDecode(ctx, "getUpdates", reqBody, &resp); err != nil {
		return nil, err
	}
	return resp.Result, nil
}

func (b *Bot) callAPI(ctx context.Context, method string, body map[string]any) error {
	data, err := json.Marshal(body)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		fmt.Sprintf("%s/bot%s/%s", apiBase, b.token, method),
		bytes.NewReader(data))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := b.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	if resp.StatusCode >= http.StatusBadRequest {
		return fmt.Errorf("telegram api status: %s", resp.Status)
	}
	var respBody apiResponse[json.RawMessage]
	if err := json.Unmarshal(bodyBytes, &respBody); err != nil {
		return err
	}
	if !respBody.OK {
		return fmt.Errorf("telegram api error: %s", respBody.Error)
	}
	return nil
}

func (b *Bot) callAndDecode(ctx context.Context, method string, body map[string]any, out any) error {
	data, err := json.Marshal(body)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		fmt.Sprintf("%s/bot%s/%s", apiBase, b.token, method),
		bytes.NewReader(data))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := b.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	if resp.StatusCode >= http.StatusBadRequest {
		return fmt.Errorf("telegram api status: %s", resp.Status)
	}
	var meta apiResponse[json.RawMessage]
	if err := json.Unmarshal(bodyBytes, &meta); err != nil {
		return err
	}
	if !meta.OK {
		return fmt.Errorf("telegram api error: %s", meta.Error)
	}
	return json.Unmarshal(bodyBytes, out)
}

func (b *Bot) sendMessage(ctx context.Context, chatID int64, text string) {
	if err := b.tg.SendMessage(ctx, chatID, text); err != nil {
		klog.Errorf("bot sendMessage chat_id=%d: %v", chatID, err)
	}
}

func parseCommand(text string) (string, string) {
	fields := strings.Fields(strings.TrimSpace(text))
	if len(fields) == 0 {
		return "", ""
	}

	command := strings.ToLower(strings.Split(fields[0], "@")[0])
	if len(fields) < 2 {
		return command, ""
	}
	return command, strings.TrimSpace(fields[1])
}
