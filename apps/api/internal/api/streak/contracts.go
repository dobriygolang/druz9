package streak

import (
	"context"

	"github.com/google/uuid"

	"api/internal/model"
)

// Service is the interface consumed by transport handlers.
type Service interface {
	GetStreak(ctx context.Context, userID uuid.UUID) (*model.StreakState, error)
	UseShield(ctx context.Context, userID uuid.UUID) (*model.StreakState, int32, error)
	PurchaseShield(ctx context.Context, userID uuid.UUID, count int32) (*model.StreakState, int32, int32, error)
}
