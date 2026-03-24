package repository

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"
)

//TODO: сюда вписать коннект к базе

type PgRepository struct {
	dbpool *pgxpool.Pool
	logger *zap.SugaredLogger
}

func NewRepository(dbpool *pgxpool.Pool, logger *zap.SugaredLogger) *PgRepository {
	return &PgRepository{
		dbpool: dbpool,
		logger: logger,
	}
}

type DataItem struct {
	ID        int64     `json:"id"`
	Key       string    `json:"key"`
	Value     string    `json:"value"`
	CreatedAt time.Time `json:"created_at"`
}

func (r *PgRepository) Hello(ctx context.Context) {
	var greeting string
	err := r.dbpool.QueryRow(ctx, "select 'Hello, world!'").Scan(&greeting)
	if err != nil {
		r.logger.Warn("QueryRow failed: %v\n", err)
	}
}

func (r *PgRepository) SaveData(ctx context.Context, key, value string) (*DataItem, error) {
	var item DataItem
	err := r.dbpool.QueryRow(ctx,
		"INSERT INTO data_items (key, value) VALUES ($1, $2) RETURNING id, key, value, created_at",
		key, value).Scan(&item.ID, &item.Key, &item.Value, &item.CreatedAt)
	if err != nil {
		r.logger.Error("Failed to save data", zap.Error(err))
		return nil, err
	}
	return &item, nil
}

func (r *PgRepository) GetData(ctx context.Context, key string) (*DataItem, error) {
	var item DataItem
	err := r.dbpool.QueryRow(ctx,
		"SELECT id, key, value, created_at FROM data_items WHERE key = $1 ORDER BY created_at DESC LIMIT 1",
		key).Scan(&item.ID, &item.Key, &item.Value, &item.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		r.logger.Error("Failed to get data", zap.Error(err))
		return nil, err
	}
	return &item, nil
}

func (r *PgRepository) GetAllData(ctx context.Context) ([]DataItem, error) {
	rows, err := r.dbpool.Query(ctx, "SELECT id, key, value, created_at FROM data_items ORDER BY created_at DESC")
	if err != nil {
		r.logger.Error("Failed to get all data", zap.Error(err))
		return nil, err
	}
	defer rows.Close()

	var items []DataItem
	for rows.Next() {
		var item DataItem
		if err := rows.Scan(&item.ID, &item.Key, &item.Value, &item.CreatedAt); err != nil {
			r.logger.Error("Failed to scan row", zap.Error(err))
			return nil, err
		}
		items = append(items, item)
	}
	return items, nil
}
