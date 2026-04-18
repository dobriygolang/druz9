package arena

import (
	"context"
	"strings"

	domain "api/internal/domain/arena"

	"github.com/google/uuid"
)

// Matchmaking queue (EnqueueMatchmaking / LeaveQueue / GetQueueStatus)
// and batch player stats lookup used to live here, backed by an
// arena_match_queue table. Both RPCs were deleted from the transport
// layer and had no other callers, so the service-layer methods — and
// their data-repo helpers — were removed too. A lobby model may
// return later; when it does, rebuild against the current schema
// rather than resurrecting the dead code from git history.

// GetPlayerStats returns a user's arena stats, filling defaults when
// the row is missing.
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
