package codeeditor

import (
	"context"
	"time"

	"api/internal/cache"
	domain "api/internal/domain/codeeditor"
	"api/internal/sandbox"
)

type Config struct {
	Repository domain.Repository
	Sandbox    Sandbox
}

type Sandbox interface {
	Execute(ctx context.Context, req sandbox.ExecutionRequest) (sandbox.ExecutionResult, error)
}

type Service struct {
	repo        domain.Repository
	sandbox     Sandbox
	taskCache   *cache.TTLCache[domain.Task]
}

func New(c Config) *Service {
	return &Service{
		repo:        c.Repository,
		sandbox:     c.Sandbox,
		taskCache:   cache.NewTTLCache[domain.Task](100, 5*time.Minute),
	}
}
