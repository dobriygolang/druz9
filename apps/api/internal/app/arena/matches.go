package arena

import (
	"context"
	"time"

	domain "api/internal/domain/arena"
	"api/internal/model"

	"github.com/google/uuid"
)

func (s *Service) CreateMatch(ctx context.Context, creator *domain.User, topic string, difficulty model.ArenaDifficulty, obfuscateOpponent bool) (*domain.Match, error) {
	if creator == nil || (isGuestUser(creator) && !s.allowGuestAccess()) {
		return nil, domain.ErrGuestsNotSupported
	}

	task, err := s.repo.PickRandomTask(ctx, topic, difficulty.String())
	if err != nil {
		return nil, err
	}
	if task == nil {
		return nil, domain.ErrNoAvailableTasks
	}

	nowTime := time.Now()
	// Use task-specific duration, or default (15 minutes) if not set
	durationSeconds := task.DurationSeconds
	if durationSeconds <= 0 {
		durationSeconds = defaultMatchDurationSeconds
	}
	match := &domain.Match{
		ID:                uuid.New(),
		CreatorUserID:     creator.ID,
		TaskID:            task.ID,
		Topic:             topic,
		Difficulty:        difficulty,
		Source:            domain.MatchSourceInvite,
		Status:            domain.MatchStatusWaiting,
		DurationSeconds:   durationSeconds,
		ObfuscateOpponent: obfuscateOpponent,
		IsRated:           true,
		WinnerReason:      domain.WinnerReasonNone,
		CreatedAt:         nowTime,
		UpdatedAt:         nowTime,
	}
	player := &domain.Player{
		MatchID:     match.ID,
		UserID:      creator.ID,
		DisplayName: resolveDisplayName(creator),
		Side:        domain.PlayerSideLeft,
		IsCreator:   true,
		JoinedAt:    nowTime,
		UpdatedAt:   nowTime,
	}

	return s.repo.CreateMatch(ctx, match, player, task.StarterCode)
}

func (s *Service) GetMatch(ctx context.Context, matchID uuid.UUID) (*domain.Match, error) {
	match, err := s.repo.GetMatch(ctx, matchID)
	if err != nil {
		return nil, err
	}
	if match == nil {
		return nil, domain.ErrMatchNotFound
	}
	if err := s.refreshMatchState(ctx, match); err != nil {
		return nil, err
	}
	if match.Status == domain.MatchStatusFinished {
		refreshed, err := s.repo.GetMatch(ctx, matchID)
		if err != nil {
			return nil, err
		}
		if refreshed != nil {
			refreshed.AntiCheatEnabled = s.antiCheatEnabled()
		}
		return refreshed, nil
	}
	match.AntiCheatEnabled = s.antiCheatEnabled()
	return match, nil
}

func (s *Service) ListOpenMatches(ctx context.Context, limit int32) ([]*domain.Match, error) {
	ids, err := s.repo.ListOpenMatchIDs(ctx, limit)
	if err != nil {
		return nil, err
	}

	if len(ids) == 0 {
		return nil, nil
	}

	// Batch load all matches in single query (instead of N+1)
	matches, err := s.repo.ListMatchesByIDs(ctx, ids)
	if err != nil {
		return nil, err
	}

	// Filter out finished matches and apply anti-cheat setting
	result := make([]*domain.Match, 0, len(matches))
	for _, match := range matches {
		if match == nil || match.Status == domain.MatchStatusFinished {
			continue
		}
		match.AntiCheatEnabled = s.antiCheatEnabled()
		result = append(result, match)
	}
	return result, nil
}

func (s *Service) JoinMatch(ctx context.Context, matchID uuid.UUID, user *domain.User) (*domain.Match, error) {
	if user == nil || (isGuestUser(user) && !s.allowGuestAccess()) {
		return nil, domain.ErrGuestsNotSupported
	}

	match, err := s.repo.GetMatch(ctx, matchID)
	if err != nil {
		return nil, err
	}
	if match == nil {
		return nil, domain.ErrMatchNotFound
	}
	if len(match.Players) >= 2 {
		for _, player := range match.Players {
			if player.UserID == user.ID {
				return match, nil
			}
		}
		return nil, domain.ErrMatchFull
	}

	side := domain.PlayerSideRight
	if len(match.Players) == 0 {
		side = domain.PlayerSideLeft
	}
	player := &domain.Player{
		MatchID:     match.ID,
		UserID:      user.ID,
		DisplayName: resolveDisplayName(user),
		Side:        side,
		IsCreator:   user.ID == match.CreatorUserID,
	}
	starterCode := ""
	if match.Task != nil {
		starterCode = match.Task.StarterCode
	}
	return s.repo.JoinMatch(ctx, matchID, player, starterCode)
}

func (s *Service) SavePlayerCode(ctx context.Context, matchID uuid.UUID, user *domain.User, code string) error {
	if user == nil || (isGuestUser(user) && !s.allowGuestAccess()) {
		return domain.ErrGuestsNotSupported
	}
	return s.repo.SavePlayerCode(ctx, matchID, user.ID, code)
}

func (s *Service) SavePlayerCodes(ctx context.Context, matchID uuid.UUID, codes map[uuid.UUID]string) error {
	if len(codes) == 0 {
		return nil
	}
	return s.repo.SavePlayerCodes(ctx, matchID, codes)
}

func (s *Service) CleanupInactiveMatches(ctx context.Context, idleFor time.Duration) (int64, error) {
	return s.repo.CleanupInactiveMatches(ctx, idleFor)
}
