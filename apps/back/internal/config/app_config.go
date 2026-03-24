package config

import (
	"github.com/go-kratos/kratos/v2/config"
	"github.com/go-kratos/kratos/v2/config/file"
)

// Load reads the base file config and overlays env and *_FILE values.
func Load(path string) (*Bootstrap, error) {
	c := config.New(
		config.WithSource(
			file.NewSource(path),
		),
	)
	defer c.Close()

	if err := c.Load(); err != nil {
		return nil, err
	}

	var cfg Bootstrap
	if err := c.Scan(&cfg); err != nil {
		return nil, err
	}
	if err := ApplyEnvOverrides(&cfg); err != nil {
		return nil, err
	}

	return &cfg, nil
}
