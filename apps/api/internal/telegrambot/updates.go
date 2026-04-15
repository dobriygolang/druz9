package telegrambot

import (
	"context"
	"fmt"
	"strings"

	"api/internal/model"

	klog "github.com/go-kratos/kratos/v2/log"
)

func (s *Service) handleUpdate(ctx context.Context, update telegramUpdate) {
	if update.Message == nil || update.Message.From == nil || update.Message.From.IsBot {
		return
	}

	command, token := parseStartCommand(update.Message.Text)

	switch command {
	case "/start":
		// Auth flow — handled below.
	case "/settings":
		s.sendMessage(ctx, update.Message.Chat.ID, "Настрой уведомления в профиле на сайте druz9.online")
		return
	case "/stop":
		s.sendMessage(ctx, update.Message.Chat.ID, "Уведомления отключены. Напиши /start чтобы включить снова.")
		return
	default:
		return
	}

	if command != "/start" {
		return
	}

	code, err := s.profile.ConfirmTelegramAuth(ctx, s.profile.BotToken(), token, model.TelegramAuthPayload{
		ID:        update.Message.From.ID,
		FirstName: update.Message.From.FirstName,
		LastName:  update.Message.From.LastName,
		Username:  update.Message.From.Username,
		PhotoURL:  s.getUserPhotoURL(ctx, update.Message.From.ID),
	})
	if err != nil {
		klog.Errorf("telegram bot confirm auth error: %v", err)
		s.sendMessage(ctx, update.Message.Chat.ID, "Не удалось подтвердить вход. Вернись в приложение и попробуй ещё раз.")
		return
	}

	s.sendMessage(ctx, update.Message.Chat.ID, fmt.Sprintf("Код входа: %s\n\nВернись на сайт и введи его в форму авторизации.", code))

	// TODO(sprint-2): Register Telegram chat ID in notification service.
	// Requires resolving app user UUID from Telegram ID, which happens after login completes.
	// Will be wired in the profile login endpoint (consumeConfirmedTelegramAuthChallenge).
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
