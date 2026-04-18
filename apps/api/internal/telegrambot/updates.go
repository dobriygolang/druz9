package telegrambot

import (
	"context"
	"fmt"
	"strings"

	klog "github.com/go-kratos/kratos/v2/log"

	"api/internal/model"
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
		klog.Errorf(
			"telegram bot confirm auth error: err=%v chat_id=%d telegram_user_id=%d username=%q command=%q token_present=%t token_len=%d",
			err,
			update.Message.Chat.ID,
			update.Message.From.ID,
			update.Message.From.Username,
			command,
			strings.TrimSpace(token) != "",
			len(strings.TrimSpace(token)),
		)
		s.sendMessage(ctx, update.Message.Chat.ID, "Не удалось подтвердить вход. Вернись в приложение и попробуй ещё раз.")
		return
	}

	s.sendMessage(ctx, update.Message.Chat.ID, fmt.Sprintf("Код входа: %s\n\nВернись на сайт и введи его в форму авторизации.", code))

	// Chat-ID ↔ user binding happens later, in profile.TelegramAuth, once
	// the user enters the login code on the web and we have their
	// resolved app-user UUID. Notification-service's LinkTelegram call is
	// issued there (see internal/api/profile/telegram_login.go).
}

func parseStartCommand(text string) (string, string) {
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
