package postgres

import (
	"context"
	"fmt"
	"time"

	"api/internal/config"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Store struct {
	DB *pgxpool.Pool
}

// PoolConfig holds PostgreSQL connection pool settings optimized for high load.
type PoolConfig struct {
	MinConns          int32         // Minimum connections (default: 10)
	MaxConns          int32         // Maximum connections (default: 100)
	MaxConnLifetime   time.Duration // Max connection lifetime (default: 1h)
	MaxConnIdleTime   time.Duration // Max idle time (default: 30m)
	HealthCheckPeriod time.Duration // Health check period (default: 1m)
}

// DefaultPoolConfig returns sensible defaults for high load.
func DefaultPoolConfig() PoolConfig {
	return PoolConfig{
		MinConns:          10,
		MaxConns:          100,
		MaxConnLifetime:   time.Hour,
		MaxConnIdleTime:   30 * time.Minute,
		HealthCheckPeriod: time.Minute,
	}
}

func New(cfg *config.Data, poolCfg PoolConfig) (*Store, func(), error) {
	if cfg == nil || cfg.Database == nil || cfg.Database.Source == "" {
		return nil, nil, fmt.Errorf("database source is required")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	poolConfig, err := pgxpool.ParseConfig(cfg.Database.Source)
	if err != nil {
		return nil, nil, fmt.Errorf("parse database config: %w", err)
	}

	// Apply pool settings for high load
	if poolCfg.MinConns > 0 {
		poolConfig.MinConns = poolCfg.MinConns
	}
	if poolCfg.MaxConns > 0 {
		poolConfig.MaxConns = poolCfg.MaxConns
	}
	if poolCfg.MaxConnLifetime > 0 {
		poolConfig.MaxConnLifetime = poolCfg.MaxConnLifetime
	}
	if poolCfg.MaxConnIdleTime > 0 {
		poolConfig.MaxConnIdleTime = poolCfg.MaxConnIdleTime
	}
	if poolCfg.HealthCheckPeriod > 0 {
		poolConfig.HealthCheckPeriod = poolCfg.HealthCheckPeriod
	}

	pool, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		return nil, nil, fmt.Errorf("create pgx pool: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, nil, fmt.Errorf("ping postgres: %w", err)
	}

	return &Store{DB: pool}, pool.Close, nil
}
