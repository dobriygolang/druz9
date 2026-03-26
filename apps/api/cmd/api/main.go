package main

import (
	"context"
	"log"

	"api/internal/closer"

	"go.uber.org/zap"
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
