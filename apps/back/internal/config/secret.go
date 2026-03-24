package config

import (
	"fmt"
	"os"
	"strings"
)

// ApplyEnvOverrides overlays env and *_FILE values onto the bootstrap config.
func ApplyEnvOverrides(cfg *Bootstrap) error {
	ensureBootstrap(cfg)

	if v, err := envOrFile("KRATOS_HTTP_ADDR"); err != nil {
		return err
	} else if v != "" {
		cfg.Server.HTTP.Addr = v
	}
	if v, err := envOrFile("KRATOS_GRPC_ADDR"); err != nil {
		return err
	} else if v != "" {
		cfg.Server.GRPC.Addr = v
	}
	if v, err := envOrFile("DB_DRIVER"); err != nil {
		return err
	} else if v != "" {
		cfg.Data.Database.Driver = v
	}
	if v, err := envOrFile("DATABASE_URL"); err != nil {
		return err
	} else if v != "" {
		cfg.Data.Database.Source = v
	}
	if v, err := envOrFile("S3_ENDPOINT"); err != nil {
		return err
	} else if v != "" {
		cfg.External.S3.Endpoint = v
	}
	if v, err := envOrFile("S3_ACCESS_KEY"); err != nil {
		return err
	} else if v != "" {
		cfg.External.S3.AccessKey = v
	}
	if v, err := envOrFile("S3_SECRET_KEY"); err != nil {
		return err
	} else if v != "" {
		cfg.External.S3.SecretKey = v
	}
	if v, err := envOrFile("S3_BUCKET"); err != nil {
		return err
	} else if v != "" {
		cfg.External.S3.Bucket = v
	}
	if v, err := envOrFile("S3_REGION"); err != nil {
		return err
	} else if v != "" {
		cfg.External.S3.Region = v
	}
	if v, err := envOrFile("TELEGRAM_BOT_TOKEN"); err != nil {
		return err
	} else if v != "" {
		cfg.External.Telegram.BotToken = v
	}
	if v, err := envOrFile("TELEGRAM_WEBHOOK_URL"); err != nil {
		return err
	} else if v != "" {
		cfg.External.Telegram.WebhookURL = v
	}

	return nil
}

func ensureBootstrap(cfg *Bootstrap) {
	if cfg.Server == nil {
		cfg.Server = &Server{}
	}
	if cfg.Server.HTTP == nil {
		cfg.Server.HTTP = &HTTP{}
	}
	if cfg.Server.GRPC == nil {
		cfg.Server.GRPC = &GRPC{}
	}
	if cfg.Data == nil {
		cfg.Data = &Data{}
	}
	if cfg.Data.Database == nil {
		cfg.Data.Database = &Database{}
	}
	if cfg.External == nil {
		cfg.External = &External{}
	}
	if cfg.External.Telegram == nil {
		cfg.External.Telegram = &Telegram{}
	}
	if cfg.External.S3 == nil {
		cfg.External.S3 = &S3{}
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
