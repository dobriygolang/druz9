package arena

import (
	"context"
	"strings"
	"time"

	arenarating "api/internal/arena/rating"
	domain "api/internal/domain/arena"
	"api/internal/model"
	"api/internal/server"

	"github.com/google/uuid"
)

const (
	defaultMatchDurationSeconds = int32(900) // 15 minutes
	freezePenaltySeconds        = int32(30)
	defaultRating               = arenarating.DefaultRating
)

func (s *Service) GetLeaderboard(ctx context.Context, limit int32) ([]*domain.LeaderboardEntry, error) {
	return s.repo.GetLeaderboard(ctx, limit)
}

func (s *Service) refreshMatchState(ctx context.Context, match *domain.Match) error {
	if match == nil || match.Status == domain.MatchStatusFinished {
		return nil
	}

	// Anti-cheat no longer affects match rating state
	// Personal penalties are applied separately in ReportPlayerSuspicion

	nowTime := time.Now()
	var accepted []*domain.Player
	for _, player := range match.Players {
		if player.AcceptedAt != nil {
			accepted = append(accepted, player)
		}
	}

	if len(accepted) == 2 {
		winner := pickWinner(accepted[0], accepted[1])
		err := s.repo.FinishMatch(ctx, match.ID, &winner.UserID, winner.reason, nowTime)
		if err == nil {
			s.observeMatchFinished(match, nowTime)
		}
		return err
	}

	if match.StartedAt != nil && nowTime.After(match.StartedAt.Add(time.Duration(match.DurationSeconds)*time.Second)) {
		if len(accepted) == 1 {
			err := s.repo.FinishMatch(ctx, match.ID, &accepted[0].UserID, domain.WinnerReasonSingleAC, nowTime)
			if err == nil {
				s.observeMatchFinished(match, nowTime)
			}
			return err
		}
		if len(accepted) == 2 {
			winner := pickWinner(accepted[0], accepted[1])
			err := s.repo.FinishMatch(ctx, match.ID, &winner.UserID, winner.reason, nowTime)
			if err == nil {
				s.observeMatchFinished(match, nowTime)
			}
			return err
		}
		err := s.repo.FinishMatch(ctx, match.ID, nil, domain.WinnerReasonNone, nowTime)
		if err == nil {
			s.observeMatchFinished(match, nowTime)
		}
		return err
	}

	return nil
}

type winnerCandidate struct {
	domain.Player
	reason model.ArenaWinnerReason
}

func pickWinner(a, b *domain.Player) winnerCandidate {
	if a.AcceptedAt != nil && b.AcceptedAt != nil {
		if a.BestRuntimeMs > 0 && b.BestRuntimeMs > 0 && a.BestRuntimeMs != b.BestRuntimeMs {
			if a.BestRuntimeMs < b.BestRuntimeMs {
				return winnerCandidate{Player: *a, reason: domain.WinnerReasonRuntime}
			}
			return winnerCandidate{Player: *b, reason: domain.WinnerReasonRuntime}
		}
		if a.AcceptedAt.Before(*b.AcceptedAt) {
			return winnerCandidate{Player: *a, reason: domain.WinnerReasonAcceptedTime}
		}
	}
	return winnerCandidate{Player: *b, reason: domain.WinnerReasonAcceptedTime}
}

func resolveDisplayName(user *domain.User) string {
	if user == nil {
		return "Игрок"
	}
	value := strings.TrimSpace(strings.TrimSpace(user.FirstName) + " " + strings.TrimSpace(user.LastName))
	if value != "" {
		return value
	}
	if value = strings.TrimSpace(user.TelegramUsername); value != "" {
		return value
	}
	return "Игрок"
}

func findPlayer(match *domain.Match, userID uuid.UUID) *domain.Player {
	for _, player := range match.Players {
		if player.UserID == userID {
			return player
		}
	}
	return nil
}

func isGuestUser(user *domain.User) bool {
	return user != nil && user.Status == model.UserStatusGuest
}

func leagueName(rating int32) model.ArenaLeague {
	return model.ArenaLeagueFromString(arenarating.LeagueName(rating))
}

func (s *Service) observeMatchFinished(match *domain.Match, finishedAt time.Time) {
	var durationSeconds float64
	if match.StartedAt != nil {
		durationSeconds = finishedAt.Sub(*match.StartedAt).Seconds()
	}
	server.IncMatchesFinished(durationSeconds)
}
