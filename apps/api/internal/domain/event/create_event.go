package event

import (
	"context"

	"api/internal/model"

	kratoserrors "github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

// CreateEvent creates a new event.
func (s *Service) CreateEvent(ctx context.Context, creatorID uuid.UUID, req model.CreateEventRequest) (*model.Event, error) {
	switch req.Repeat {
	case "", model.EventRepeatNone, model.EventRepeatDaily, model.EventRepeatWeekly, model.EventRepeatMonthly:
	default:
		return nil, kratoserrors.BadRequest("INVALID_PAYLOAD", "invalid repeat")
	}
	return s.repo.CreateEvent(ctx, creatorID, req)
}
