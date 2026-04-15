package main

import (
	"context"

	"api/internal/clients/notification"
	profiledomain "api/internal/domain/profile"
	"api/internal/telegrambot"
)

func startTelegramBotWorker(service *profiledomain.Service, notif notification.Sender) func() error {
	bot := telegrambot.New(service.BotToken(), service, notif)
	if !bot.Enabled() {
		return func() error { return nil }
	}

	ctx, cancel := context.WithCancel(context.Background())

	go func() {
		_ = bot.Run(ctx)
	}()

	return func() error {
		cancel()
		return nil
	}
}
