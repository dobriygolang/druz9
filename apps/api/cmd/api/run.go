package main

import (
	// #nosec G108 -- pprof is intentionally exposed on dedicated metrics endpoint in non-public ops context.
	_ "net/http/pprof"

	"github.com/go-kratos/kratos/v2"

	appLogger "api/internal/logger"
)

// Run starts the API server.
func Run() (*kratos.App, *appLogger.Logger, error) {
	bootstrap, err := initializeBootstrap()
	if err != nil {
		return nil, nil, err
	}

	storage, err := initializeStorage(bootstrap)
	if err != nil {
		return nil, nil, err
	}

	services, err := initializeServices(bootstrap, storage)
	if err != nil {
		return nil, nil, err
	}

	app := initializeTransports(bootstrap, storage, services)

	return app, bootstrap.logger, nil
}
