package db

import (
	"context"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"
)

type DB struct {
	Pool *pgxpool.Pool
}

func NewDB(logger *zap.SugaredLogger) *DB {
	dbpool, err := pgxpool.New(context.Background(), os.Getenv("DATABASE_URL"))
	if err != nil {
		logger.Fatal("can't init database connection", zap.Error(err))
	}

	return &DB{Pool: dbpool}
}

func (db *DB) Close() {
	db.Pool.Close()
}
