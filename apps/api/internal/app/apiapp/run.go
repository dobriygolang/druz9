package apiapp

import (
	"github.com/go-kratos/kratos/v2"

	appLogger "api/internal/logger"
)

// Run wires storage, services, transports and background jobs for the API app.
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
