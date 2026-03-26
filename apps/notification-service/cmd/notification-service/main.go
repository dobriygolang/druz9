package main

import (
	"context"
	"log"

	"notification-service/internal/closer"

	"go.uber.org/zap"
)

func main() {
	app, logger, err := newApp()
	if err != nil {
		log.Fatal(err)
	}

	if err := app.Run(); err != nil {
		logger.FatalKV(context.Background(), "run app", zap.Error(err))
	}
	closer.Close()
}
