package event

import (
	"context"
	"fmt"

	kratoserrors "github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"

	"api/internal/model"
)

// CreateEvent creates a new event.
// Admin-created events are approved immediately; others go to pending.
func (s *Service) CreateEvent(ctx context.Context, creatorID uuid.UUID, isAdmin bool, req model.CreateEventRequest) (*model.Event, error) {
	switch req.Repeat {
	case "", model.EventRepeatNone, model.EventRepeatDaily, model.EventRepeatWeekly, model.EventRepeatMonthly, model.EventRepeatYearly:
	default:
		return nil, kratoserrors.BadRequest("INVALID_PAYLOAD", "invalid repeat")
	}
	if req.ScheduledAt == nil && req.Repeat != "" && req.Repeat != model.EventRepeatNone {
		return nil, kratoserrors.BadRequest("INVALID_PAYLOAD", "scheduled_at is required for repeating events")
	}

	if isAdmin {
		req.Status = model.EventStatusApproved
	} else {
		req.Status = model.EventStatusPending
	}

	event, err := s.repo.CreateEvent(ctx, creatorID, req)
	if err != nil {
		return nil, fmt.Errorf("create event: %w", err)
	}
	return event, nil
}
