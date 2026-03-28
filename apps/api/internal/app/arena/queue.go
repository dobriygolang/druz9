package arena

import (
	"context"
	"strings"

	domain "api/internal/domain/arena"

	"github.com/google/uuid"
)

func (s *Service) EnqueueMatchmaking(ctx context.Context, user *domain.User, topic, difficulty string, obfuscateOpponent bool) (*domain.QueueState, error) {
	if user == nil || (isGuestUser(user) && !s.allowGuestAccess()) {
		return nil, domain.ErrGuestsNotSupported
	}

	task, err := s.repo.PickRandomTask(ctx, topic, difficulty)
	if err != nil {
		return nil, err
	}
	if task == nil {
		return nil, domain.ErrNoAvailableTasks
	}

	match, matched, err := s.repo.MatchmakeOrEnqueue(ctx, user, task, topic, difficulty, obfuscateOpponent)
	if err != nil {
		return nil, err
	}
	if matched && match != nil {
		return &domain.QueueState{
			Status:     "matched",
			Topic:      topic,
			Difficulty: difficulty,
			Match:      match,
		}, nil
	}

	entry, err := s.repo.GetQueueEntry(ctx, user.ID)
	if err != nil {
		return nil, err
	}
	queueSize, err := s.repo.CountQueueEntries(ctx)
	if err != nil {
		return nil, err
	}
	state := &domain.QueueState{
		Status:     "queued",
		Topic:      topic,
		Difficulty: difficulty,
		QueueSize:  queueSize,
	}
	if entry != nil {
		state.Topic = entry.Topic
		state.Difficulty = entry.Difficulty
		state.QueuedAt = &entry.QueuedAt
	}
	return state, nil
}

func (s *Service) LeaveQueue(ctx context.Context, user *domain.User) error {
	if user == nil {
		return domain.ErrGuestsNotSupported
	}
	return s.repo.RemoveFromQueue(ctx, user.ID)
}

func (s *Service) GetQueueStatus(ctx context.Context, user *domain.User) (*domain.QueueState, error) {
	queueSize, err := s.repo.CountQueueEntries(ctx)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return &domain.QueueState{Status: "idle", QueueSize: queueSize}, nil
	}

	match, err := s.repo.FindOpenMatchByUser(ctx, user.ID)
	if err != nil {
		return nil, err
	}
	if match != nil {
		return &domain.QueueState{
			Status:    "matched",
			QueueSize: queueSize,
			Match:     match,
		}, nil
	}

	entry, err := s.repo.GetQueueEntry(ctx, user.ID)
	if err != nil {
		return nil, err
	}
	if entry == nil {
		return &domain.QueueState{Status: "idle", QueueSize: queueSize}, nil
	}
	return &domain.QueueState{
		Status:     "queued",
		Topic:      entry.Topic,
		Difficulty: entry.Difficulty,
		QueuedAt:   &entry.QueuedAt,
		QueueSize:  queueSize,
	}, nil
}

func (s *Service) GetPlayerStats(ctx context.Context, userID uuid.UUID) (*domain.PlayerStats, error) {
	stats, err := s.repo.GetPlayerStats(ctx, userID)
	if err != nil {
		return nil, err
	}
	if stats == nil {
		return &domain.PlayerStats{
			UserID:  userID.String(),
			Rating:  defaultRating,
			League:  leagueName(defaultRating),
			Matches: 0,
		}, nil
	}
	stats.League = leagueName(stats.Rating)
	return stats, nil
}

func (s *Service) ReportPlayerSuspicion(ctx context.Context, matchID uuid.UUID, user *domain.User, reason string) error {
	if !s.antiCheatEnabled() {
		return nil
	}
	if user == nil {
		return domain.ErrGuestsNotSupported
	}
	reason = strings.TrimSpace(reason)
	if reason == "" {
		return nil
	}
	return s.repo.ReportPlayerSuspicion(ctx, matchID, user.ID, reason)
}
