package main

import (
	"context"

	profiledomain "api/internal/domain/profile"
	"api/internal/telegrambot"

	klog "github.com/go-kratos/kratos/v2/log"
)

func startTelegramBotWorker(service *profiledomain.Service) func() error {
	bot := telegrambot.New(service.BotToken(), service)
	if !bot.Enabled() {
		return func() error { return nil }
	}

	ctx, cancel := context.WithCancel(context.Background())

	go func() {
		defer func() {
			if r := recover(); r != nil {
				klog.Errorf("telegram bot panic: %v", r)
			}
		}()
		_ = bot.Run(ctx)
	}()

	return func() error {
		cancel()
		return nil
	}
}

func startProfileCleanupWorker(service *profiledomain.Service) func() error {
	ctx, cancel := context.WithCancel(context.Background())
	stop := service.StartCleanupWorker(ctx)
	return func() error {
		cancel()
		return stop()
	}
}
