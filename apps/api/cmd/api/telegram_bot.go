package main

import (
	"context"

	profiledomain "api/internal/domain/profile"
	"api/internal/telegrambot"
)

func startTelegramBotWorker(service *profiledomain.Service) func() error {
	bot := telegrambot.New(service.BotToken(), service)
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
