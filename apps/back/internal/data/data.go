package data

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"back/internal/config"

	"github.com/go-kratos/kratos/v2/log"
	"github.com/google/wire"

	// Register the pq driver for database/sql.
	_ "github.com/lib/pq"
)

// ProviderSet is data providers.
var ProviderSet = wire.NewSet(NewData, NewPodcastRepo, NewProfileRepo)

// Data .
type Data struct {
	DB *sql.DB
}

// NewData .
func NewData(c *config.Data) (*Data, func(), error) {
	if c == nil || c.Database == nil {
		return nil, nil, fmt.Errorf("database config is required")
	}
	if c.Database.Driver == "" {
		return nil, nil, fmt.Errorf("database driver is required")
	}
	if c.Database.Source == "" {
		return nil, nil, fmt.Errorf("database source is required")
	}

	db, err := sql.Open(c.Database.Driver, c.Database.Source)
	if err != nil {
		return nil, nil, fmt.Errorf("open database: %w", err)
	}

	db.SetMaxOpenConns(20)
	db.SetMaxIdleConns(10)
	db.SetConnMaxLifetime(30 * time.Minute)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		_ = db.Close()
		return nil, nil, fmt.Errorf("ping database: %w", err)
	}

	cleanup := func() {
		log.Info("closing the data resources")
		_ = db.Close()
	}
	return &Data{DB: db}, cleanup, nil
}
