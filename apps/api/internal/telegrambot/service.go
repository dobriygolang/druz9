package telegrambot

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	profiledomain "api/internal/domain/profile"
	"api/internal/model"

	klog "github.com/go-kratos/kratos/v2/log"
)

const telegramAPIBase = "https://api.telegram.org"

type Service struct {
	client  *http.Client
	token   string
	profile *profiledomain.Service
}

func New(token string, profile *profiledomain.Service) *Service {
	return &Service{
		client:  &http.Client{Timeout: 70 * time.Second},
		token:   strings.TrimSpace(token),
		profile: profile,
	}
}

func (s *Service) Enabled() bool {
	return s != nil && s.token != "" && s.profile != nil
}

func (s *Service) Run(ctx context.Context) error {
	if !s.Enabled() {
		return nil
	}
	if err := s.deleteWebhook(ctx); err != nil {
		klog.Errorf("telegram bot deleteWebhook error: %v", err)
	}

	var offset int64
	for {
		select {
		case <-ctx.Done():
			return nil
		default:
		}

		updates, err := s.getUpdates(ctx, offset)
		if err != nil {
			klog.Errorf("telegram bot getUpdates error: %v", err)
			select {
			case <-ctx.Done():
				return nil
			case <-time.After(3 * time.Second):
				continue
			}
		}

		for _, update := range updates {
			offset = update.UpdateID + 1
			s.handleUpdate(ctx, update)
		}
	}
}

func (s *Service) handleUpdate(ctx context.Context, update telegramUpdate) {
	if update.Message == nil || update.Message.From == nil || update.Message.From.IsBot {
		return
	}

	command, token := parseStartCommand(update.Message.Text)
	if command != "/start" {
		return
	}

	if token == "" {
		s.sendMessage(ctx, update.Message.Chat.ID, "Открой ссылку авторизации заново из приложения.")
		return
	}

	code, err := s.profile.ConfirmTelegramAuth(ctx, s.profile.BotToken(), token, model.TelegramAuthPayload{
		ID:        update.Message.From.ID,
		FirstName: update.Message.From.FirstName,
		LastName:  update.Message.From.LastName,
		Username:  update.Message.From.Username,
		PhotoURL:  "",
	})
	if err != nil {
		klog.Errorf("telegram bot confirm auth error: %v", err)
		s.sendMessage(ctx, update.Message.Chat.ID, "Не удалось подтвердить вход. Вернись в приложение и попробуй ещё раз.")
		return
	}

	s.sendMessage(ctx, update.Message.Chat.ID, fmt.Sprintf("Код входа: %s\n\nВернись на сайт и введи его в форму авторизации.", code))
}

func parseStartCommand(text string) (string, string) {
	fields := strings.Fields(strings.TrimSpace(text))
	if len(fields) == 0 {
		return "", ""
	}

	command := strings.ToLower(fields[0])
	command = strings.Split(command, "@")[0]
	if command != "/start" {
		return "", ""
	}
	if len(fields) < 2 {
		return command, ""
	}
	return command, strings.TrimSpace(fields[1])
}

func (s *Service) getUpdates(ctx context.Context, offset int64) ([]telegramUpdate, error) {
	reqBody := map[string]any{
		"offset":          offset,
		"timeout":         50,
		"allowed_updates": []string{"message"},
	}

	var resp telegramAPIResponse[[]telegramUpdate]
	if err := s.call(ctx, "getUpdates", reqBody, &resp); err != nil {
		return nil, err
	}
	return resp.Result, nil
}

func (s *Service) sendMessage(ctx context.Context, chatID int64, text string) {
	reqBody := map[string]any{
		"chat_id": chatID,
		"text":    text,
	}
	if err := s.call(ctx, "sendMessage", reqBody, nil); err != nil {
		klog.Errorf("telegram bot sendMessage error: %v", err)
	}
}

func (s *Service) deleteWebhook(ctx context.Context) error {
	reqBody := map[string]any{
		"drop_pending_updates": false,
	}
	return s.call(ctx, "deleteWebhook", reqBody, nil)
}

func (s *Service) call(ctx context.Context, method string, requestBody any, out any) error {
	body, err := json.Marshal(requestBody)
	if err != nil {
		return fmt.Errorf("marshal telegram request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, fmt.Sprintf("%s/bot%s/%s", telegramAPIBase, s.token, method), bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("build telegram request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("telegram request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= http.StatusBadRequest {
		return fmt.Errorf("telegram api status: %s", resp.Status)
	}

	if out == nil {
		return nil
	}
	if err := json.NewDecoder(resp.Body).Decode(out); err != nil {
		return fmt.Errorf("decode telegram response: %w", err)
	}
	return nil
}

type telegramAPIResponse[T any] struct {
	OK     bool   `json:"ok"`
	Result T      `json:"result"`
	Error  string `json:"description"`
}

type telegramUpdate struct {
	UpdateID int64            `json:"update_id"`
	Message  *telegramMessage `json:"message"`
}

type telegramMessage struct {
	Text string        `json:"text"`
	Chat telegramChat  `json:"chat"`
	From *telegramUser `json:"from"`
}

type telegramChat struct {
	ID int64 `json:"id"`
}

type telegramUser struct {
	ID        int64  `json:"id"`
	IsBot     bool   `json:"is_bot"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Username  string `json:"username"`
}
