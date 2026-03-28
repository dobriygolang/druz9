package arena

import (
	"context"

	domain "api/internal/domain/arena"
	"api/internal/sandbox"
)

type Sandbox interface {
	Execute(ctx context.Context, req sandbox.ExecutionRequest) (sandbox.ExecutionResult, error)
}

type Config struct {
	Repository       domain.Repository
	Sandbox          Sandbox
	AllowGuestAccess func() bool
	AntiCheatEnabled func() bool
}

type Service struct {
	repo             domain.Repository
	sandbox          Sandbox
	allowGuestAccess func() bool
	antiCheatEnabled func() bool
}

func New(c Config) *Service {
	allowGuestAccess := c.AllowGuestAccess
	if allowGuestAccess == nil {
		allowGuestAccess = func() bool { return false }
	}
	antiCheatEnabled := c.AntiCheatEnabled
	if antiCheatEnabled == nil {
		antiCheatEnabled = func() bool { return true }
	}
	return &Service{
		repo:             c.Repository,
		sandbox:          c.Sandbox,
		allowGuestAccess: allowGuestAccess,
		antiCheatEnabled: antiCheatEnabled,
	}
}
