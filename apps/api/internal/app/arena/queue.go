package arena

import (
	"context"
	"strings"

	domain "api/internal/domain/arena"
	"api/internal/model"

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
			Status:     model.ArenaMatchStatusActive,
			Topic:      topic,
			Difficulty: model.ArenaDifficultyFromString(difficulty),
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
		Status:     model.ArenaMatchStatusWaiting,
		Topic:      topic,
		Difficulty: model.ArenaDifficultyFromString(difficulty),
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
		return &domain.QueueState{Status: model.ArenaMatchStatusUnknown, QueueSize: queueSize}, nil
	}

	match, err := s.repo.FindOpenMatchByUser(ctx, user.ID)
	if err != nil {
		return nil, err
	}
	if match != nil {
		if err := s.refreshMatchState(ctx, match); err != nil {
			return nil, err
		}

		refreshed, err := s.repo.GetMatch(ctx, match.ID)
		if err != nil {
			return nil, err
		}
		if refreshed != nil && refreshed.Status != domain.MatchStatusFinished {
			return &domain.QueueState{
				Status:    model.ArenaMatchStatusActive,
				QueueSize: queueSize,
				Match:     refreshed,
			}, nil
		}
	}

	entry, err := s.repo.GetQueueEntry(ctx, user.ID)
	if err != nil {
		return nil, err
	}
	if entry == nil {
		return &domain.QueueState{Status: model.ArenaMatchStatusUnknown, QueueSize: queueSize}, nil
	}
	return &domain.QueueState{
		Status:     model.ArenaMatchStatusWaiting,
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

func (s *Service) GetPlayerStatsBatch(ctx context.Context, userIDs []uuid.UUID) (map[uuid.UUID]*domain.PlayerStats, error) {
	statsMap, err := s.repo.GetPlayerStatsBatch(ctx, userIDs)
	if err != nil {
		return nil, err
	}

	// Fill in defaults for missing users
	result := make(map[uuid.UUID]*domain.PlayerStats, len(userIDs))
	for _, userID := range userIDs {
		if stats, ok := statsMap[userID]; ok && stats != nil {
			stats.League = leagueName(stats.Rating)
			result[userID] = stats
		} else {
			result[userID] = &domain.PlayerStats{
				UserID:  userID.String(),
				Rating:  defaultRating,
				League:  leagueName(defaultRating),
				Matches: 0,
			}
		}
	}
	return result, nil
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

	if err := s.repo.ReportPlayerSuspicion(ctx, matchID, user.ID, reason); err != nil {
		return err
	}

	player, err := s.repo.GetPlayer(ctx, matchID, user.ID)
	if err != nil {
		return err
	}
	if player == nil {
		return nil
	}

	// On 2nd strike: apply personal penalty only once
	// Match continues - winner is determined only by accepted or timeout
	if player.SuspicionCount >= 2 && !player.AntiCheatPenalized {
		if err := s.repo.ApplyAntiCheatPenalty(ctx, matchID, user.ID, -25, "anti_cheat"); err != nil {
			return err
		}
	}

	return nil
}
