package main

import (
	// #nosec G108 -- pprof is intentionally exposed on dedicated metrics endpoint in non-public ops context.
	_ "net/http/pprof"

	"github.com/go-kratos/kratos/v2"

	"api/internal/app/apiapp"
	appLogger "api/internal/logger"
)

// Run starts the API server.
func Run() (*kratos.App, *appLogger.Logger, error) {
	return apiapp.Run()
}
