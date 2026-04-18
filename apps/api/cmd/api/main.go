package main

import (
	"context"
	"log"

	"go.uber.org/zap"

	"api/internal/closer"
)

func main() {
	application, logger, err := Run()
	if err != nil {
		log.Fatal(err)
	}

	if err := application.Run(); err != nil {
		logger.FatalKV(context.Background(), "run app", zap.Error(err))
	}
	closer.Close()
}
