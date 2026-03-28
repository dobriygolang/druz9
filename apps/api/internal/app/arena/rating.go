package arena

import (
	"context"
	"strings"
	"time"

	arenarating "api/internal/arena/rating"
	"api/internal/model"
	domain "api/internal/domain/arena"

	"github.com/google/uuid"
)

const (
	defaultMatchDurationSeconds = int32(600)
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

	isRated := true
	unratedReason := ""
	if s.antiCheatEnabled() {
		for _, player := range match.Players {
			if player != nil && player.SuspicionCount > 0 {
				isRated = false
				unratedReason = "anti_cheat"
				break
			}
		}
	}
	if err := s.repo.SetMatchRatingState(ctx, match.ID, isRated, unratedReason); err != nil {
		return err
	}

	nowTime := time.Now()
	var accepted []*domain.Player
	for _, player := range match.Players {
		if player.AcceptedAt != nil {
			accepted = append(accepted, player)
		}
	}

	if len(accepted) == 2 {
		winner := pickWinner(accepted[0], accepted[1])
		return s.repo.FinishMatch(ctx, match.ID, &winner.UserID, winner.reason, nowTime)
	}

	if len(accepted) == 1 {
		return s.repo.FinishMatch(ctx, match.ID, &accepted[0].UserID, domain.WinnerReasonSingleAC, nowTime)
	}

	if match.StartedAt != nil && nowTime.After(match.StartedAt.Add(time.Duration(match.DurationSeconds)*time.Second)) {
		if len(accepted) == 1 {
			return s.repo.FinishMatch(ctx, match.ID, &accepted[0].UserID, domain.WinnerReasonTimeout, nowTime)
		}
		if len(accepted) == 2 {
			winner := pickWinner(accepted[0], accepted[1])
			return s.repo.FinishMatch(ctx, match.ID, &winner.UserID, winner.reason, nowTime)
		}
		return s.repo.FinishMatch(ctx, match.ID, nil, domain.WinnerReasonNone, nowTime)
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
