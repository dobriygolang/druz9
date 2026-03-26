package config

import (
	"fmt"
	"os"
	"strings"
	"time"
)

func Load() (*Bootstrap, error) {
	cfg := defaultBootstrap()

	if v, err := envOrFile("HTTP_ADDR"); err != nil {
		return nil, err
	} else if v != "" {
		cfg.Server.HTTP.Addr = v
	}
	if v, err := envOrFile("GRPC_ADDR"); err != nil {
		return nil, err
	} else if v != "" {
		cfg.Server.GRPC.Addr = v
	}

	if v, err := envOrFile("HTTP_TIMEOUT"); err != nil {
		return nil, err
	} else if v != "" {
		d, parseErr := time.ParseDuration(v)
		if parseErr != nil {
			return nil, fmt.Errorf("parse HTTP_TIMEOUT: %w", parseErr)
		}
		cfg.Server.HTTP.Timeout = d
	}
	if v, err := envOrFile("GRPC_TIMEOUT"); err != nil {
		return nil, err
	} else if v != "" {
		d, parseErr := time.ParseDuration(v)
		if parseErr != nil {
			return nil, fmt.Errorf("parse GRPC_TIMEOUT: %w", parseErr)
		}
		cfg.Server.GRPC.Timeout = d
	}

	if v, err := envOrFile("DATABASE_URL"); err != nil {
		return nil, err
	} else if v != "" {
		cfg.Data.Database.Source = v
	}

	if cfg.Data.Database.Source == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}

	return cfg, nil
}

func defaultBootstrap() *Bootstrap {
	return &Bootstrap{
		Server: &Server{
			HTTP: &HTTP{
				Addr:    ":8080",
				Timeout: 5 * time.Second,
			},
			GRPC: &GRPC{
				Addr:    ":9000",
				Timeout: 5 * time.Second,
			},
		},
		Data: &Data{
			Database: &Database{},
		},
	}
}

func envOrFile(key string) (string, error) {
	value := strings.TrimSpace(os.Getenv(key))
	filePath := strings.TrimSpace(os.Getenv(key + "_FILE"))
	if value != "" && filePath != "" {
		return "", fmt.Errorf("%s and %s_FILE are both set", key, key)
	}
	if value != "" {
		return value, nil
	}
	if filePath == "" {
		return "", nil
	}
	content, err := os.ReadFile(filePath)
	if err != nil {
		return "", fmt.Errorf("read %s_FILE: %w", key, err)
	}
	return strings.TrimSpace(string(content)), nil
}
