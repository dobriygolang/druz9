package main

import (
	// #nosec G108 -- pprof is intentionally exposed on dedicated metrics endpoint in non-public ops context.
	_ "net/http/pprof"

	appLogger "api/internal/logger"

	"github.com/go-kratos/kratos/v2"
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

	app, err := initializeTransports(bootstrap, storage, services)
	if err != nil {
		return nil, nil, err
	}

	return app, bootstrap.logger, nil
}
