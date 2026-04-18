// Package duel_replay holds time-series replay logic: storing events,
// reading back a full replay, listing a user's past matches. The package
// deliberately does NOT create the replay record itself — that's the
// responsibility of whichever subsystem finishes a match (arena,
// friend_challenge) so we don't duplicate winner-resolution logic here.
package duel_replay

import (
	"context"
	"errors"
	"strings"

	"api/internal/model"

	"github.com/google/uuid"
)

const (
	maxLabelLen   = 200
	maxListLimit  = 100
	defaultListLimit = 50
	// maxEventTMs is an absurdly long match ceiling; keeps recorder from
	// passing nonsense timestamps (e.g. 10 hours on a 10-minute match).
	maxEventTMs = 60 * 60 * 1000 // 1h in ms
)

//go:generate mockery --case underscore --name Repository --with-expecter --output mocks

// Repository is the DB boundary.
type Repository interface {
	GetSummary(ctx context.Context, replayID uuid.UUID) (*model.DuelReplaySummary, error)
	ListEvents(ctx context.Context, replayID uuid.UUID) ([]*model.DuelReplayEvent, error)
	ListForUser(ctx context.Context, userID uuid.UUID, limit, offset int32) ([]*model.DuelReplaySummary, int32, error)
	InsertEvent(ctx context.Context, ev *model.DuelReplayEvent) error
	CreateReplay(ctx context.Context, r *model.DuelReplaySummary) error
}

// Config bundles domain dependencies.
type Config struct {
	Repository Repository
}

// Service exposes domain operations.
type Service struct {
	repo Repository
}

// NewService constructs a Service.
func NewService(c Config) *Service { return &Service{repo: c.Repository} }

// Domain errors. API layer translates to kratos codes.
var (
	ErrReplayNotFound = errors.New("duel_replay: not found")
	ErrNotParticipant = errors.New("duel_replay: user is not a participant")
	ErrBadTimeMs      = errors.New("duel_replay: t_ms is out of range")
	ErrLabelTooLong   = errors.New("duel_replay: label exceeds 200 chars")
)

// GetReplay returns summary + events. Only participants of the replay can
// read it (we also allow admins to bypass — enforced by the caller before
// the context reaches us). The caller passes userID = nil for admin reads.
func (s *Service) GetReplay(ctx context.Context, replayID uuid.UUID, viewer *uuid.UUID) (*model.ReplayWithEvents, error) {
	summary, err := s.repo.GetSummary(ctx, replayID)
	if err != nil {
		return nil, err
	}
	if summary == nil {
		return nil, ErrReplayNotFound
	}
	if viewer != nil && *viewer != summary.Player1ID && *viewer != summary.Player2ID {
		return nil, ErrNotParticipant
	}
	events, err := s.repo.ListEvents(ctx, replayID)
	if err != nil {
		return nil, err
	}
	if events == nil {
		events = []*model.DuelReplayEvent{}
	}
	return &model.ReplayWithEvents{Summary: summary, Events: events}, nil
}

// ListMyReplays returns the user's replay history (both sides of the duel).
func (s *Service) ListMyReplays(ctx context.Context, userID uuid.UUID, limit, offset int32) (*model.ReplayList, error) {
	if limit <= 0 {
		limit = defaultListLimit
	}
	if limit > maxListLimit {
		limit = maxListLimit
	}
	if offset < 0 {
		offset = 0
	}
	replays, total, err := s.repo.ListForUser(ctx, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	if replays == nil {
		replays = []*model.DuelReplaySummary{}
	}
	return &model.ReplayList{Replays: replays, Total: total}, nil
}

// RecordEvent appends one timeline event. Validates range + participation
// against the replay's players.
func (s *Service) RecordEvent(ctx context.Context, in model.RecordEventInput) (*model.DuelReplayEvent, error) {
	if in.TMs < 0 || in.TMs > maxEventTMs {
		return nil, ErrBadTimeMs
	}
	in.Label = strings.TrimSpace(in.Label)
	if len(in.Label) > maxLabelLen {
		return nil, ErrLabelTooLong
	}

	summary, err := s.repo.GetSummary(ctx, in.ReplayID)
	if err != nil {
		return nil, err
	}
	if summary == nil {
		return nil, ErrReplayNotFound
	}
	if in.UserID != summary.Player1ID && in.UserID != summary.Player2ID {
		return nil, ErrNotParticipant
	}

	ev := &model.DuelReplayEvent{
		ID:         uuid.New(),
		ReplayID:   in.ReplayID,
		UserID:     in.UserID,
		TMs:        in.TMs,
		Kind:       in.Kind,
		Label:      in.Label,
		LinesCount: in.LinesCount,
	}
	if err := s.repo.InsertEvent(ctx, ev); err != nil {
		return nil, err
	}
	return ev, nil
}

// CreateReplay is the integration point used by arena/friend_challenge when
// a match finishes. It's intentionally exposed so other subsystems don't
// need direct DB access.
func (s *Service) CreateReplay(ctx context.Context, r *model.DuelReplaySummary) error {
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	return s.repo.CreateReplay(ctx, r)
}
