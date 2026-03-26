package data

import (
	"context"
	"fmt"
	"time"

	"notification-service/internal/config"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Data struct {
	DB *pgxpool.Pool
}

func NewData(c *config.Data) (*Data, func(), error) {
	if c == nil || c.Database == nil || c.Database.Source == "" {
		return nil, nil, fmt.Errorf("database source is required")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, c.Database.Source)
	if err != nil {
		return nil, nil, fmt.Errorf("create pgx pool: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, nil, fmt.Errorf("ping postgres: %w", err)
	}

	cleanup := func() {
		pool.Close()
	}

	return &Data{DB: pool}, cleanup, nil
}
