package duel_replay

import (
	"context"

	"github.com/google/uuid"

	"api/internal/model"
)

// Service is the domain surface consumed by transport handlers.
type Service interface {
	GetReplay(ctx context.Context, replayID uuid.UUID, viewer *uuid.UUID) (*model.ReplayWithEvents, error)
	ListMyReplays(ctx context.Context, userID uuid.UUID, limit, offset int32) (*model.ReplayList, error)
	RecordEvent(ctx context.Context, in model.RecordEventInput) (*model.DuelReplayEvent, error)
}
