package repository

import (
	"context"
	"errors"

	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

type RedisRepository struct {
	rdb    *redis.Client
	logger *zap.SugaredLogger
}

func NewRedisRepo(rdb *redis.Client, logger *zap.SugaredLogger) *RedisRepository {
	return &RedisRepository{
		rdb:    rdb,
		logger: logger,
	}
}

func (r *RedisRepository) Set(ctx context.Context, key, value string) error {
	err := r.rdb.Set(ctx, key, value, 0).Err()
	if err != nil {
		r.logger.Error("redis cant set value by key", zap.Error(err))
		return err
	}
	return nil
}

func (r *RedisRepository) Get(ctx context.Context, key string) (string, error) {
	value, err := r.rdb.Get(ctx, key).Result()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return "", nil
		}
		r.logger.Error("redis cant get value by key", zap.Error(err))
		return "", err
	}
	return value, nil
}
