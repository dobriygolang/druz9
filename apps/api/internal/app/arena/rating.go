package arena

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"

	domain "api/internal/domain/arena"
	arenarating "api/internal/domain/arena/rating"
	"api/internal/metrics"
	"api/internal/model"
)

const (
	defaultMatchDurationSeconds = int32(900) // 15 minutes
	freezePenaltySeconds        = int32(30)
	defaultRating               = arenarating.DefaultRating
	// arenaWinXP feeds into the active Season Pass. Chosen to roughly
	// match a mission completion so duel grinding and questing feel
	// equally rewarding toward tier progression.
	arenaWinXP = int32(150)
)

func (s *Service) GetLeaderboard(ctx context.Context, limit int32) ([]*domain.LeaderboardEntry, error) {
	s.leaderboardMu.Lock()
	cached := s.leaderboardCache
	s.leaderboardMu.Unlock()

	if cached.entries != nil && time.Now().Before(cached.expiresAt) {
		return cached.entries, nil
	}

	entries, err := s.repo.GetLeaderboard(ctx, limit)
	if err != nil {
		return nil, err
	}

	s.leaderboardMu.Lock()
	s.leaderboardCache = leaderboardSnapshot{
		entries:   entries,
		expiresAt: time.Now().Add(leaderboardCacheTTL),
	}
	s.leaderboardMu.Unlock()

	return entries, nil
}

func (s *Service) refreshMatchState(ctx context.Context, match *domain.Match) error {
	if match == nil || match.Status == domain.MatchStatusFinished {
		return nil
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
		err := s.repo.FinishMatch(ctx, match.ID, &winner.UserID, winner.reason, nowTime)
		if err == nil {
			s.observeMatchFinished(match, nowTime)
			s.awardSeasonPassXP(ctx, winner.UserID, arenaWinXP)
			winnerID := winner.UserID
			s.recordReplaySummary(ctx, match, nowTime, &winnerID)
		}
		return err
	}

	if match.StartedAt != nil && nowTime.After(match.StartedAt.Add(time.Duration(match.DurationSeconds)*time.Second)) {
		if len(accepted) == 1 {
			err := s.repo.FinishMatch(ctx, match.ID, &accepted[0].UserID, domain.WinnerReasonSingleAC, nowTime)
			if err == nil {
				s.observeMatchFinished(match, nowTime)
				s.awardSeasonPassXP(ctx, accepted[0].UserID, arenaWinXP)
				winnerID := accepted[0].UserID
				s.recordReplaySummary(ctx, match, nowTime, &winnerID)
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
		return ""
	}
	value := strings.TrimSpace(strings.TrimSpace(user.FirstName) + " " + strings.TrimSpace(user.LastName))
	if value != "" {
		return value
	}
	if value = strings.TrimSpace(user.Username); value != "" {
		return value
	}
	return ""
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

// recordReplaySummary asks the duel_replay subsystem to persist a header
// for this finished match so players can revisit it later. Requires at
// least 2 players (1v1 rated duels). Non-fatal on failure — replays are
// a convenience, not a correctness concern for the match itself.
func (s *Service) recordReplaySummary(ctx context.Context, match *domain.Match, finishedAt time.Time, winnerID *uuid.UUID) {
	if s.duelReplay == nil || match == nil || len(match.Players) < 2 {
		return
	}
	p1, p2 := match.Players[0], match.Players[1]
	var durationMs int32
	if match.StartedAt != nil {
		if d := finishedAt.Sub(*match.StartedAt); d > 0 {
			durationMs = int32(d / time.Millisecond)
		}
	}
	taskTitle, taskTopic := "", match.Topic
	var taskDifficulty int32
	if match.Task != nil {
		taskTitle = match.Task.Title
		taskDifficulty = int32(match.Task.Difficulty)
	}
	summary := &model.DuelReplaySummary{
		ID:              uuid.New(),
		SourceKind:      model.ReplaySourceArena,
		SourceID:        match.ID,
		Player1ID:       p1.UserID,
		Player1Username: p1.DisplayName,
		Player2ID:       p2.UserID,
		Player2Username: p2.DisplayName,
		TaskTitle:       taskTitle,
		TaskTopic:       taskTopic,
		TaskDifficulty:  taskDifficulty,
		DurationMs:      durationMs,
		WinnerID:        winnerID,
		CompletedAt:     finishedAt,
	}
	_ = s.duelReplay.CreateReplay(ctx, summary)
}

// awardSeasonPassXP credits the winner's Season Pass when one is active.
// Failures are logged (via the domain layer) but never bubble up — a broken
// pass service must not block match completion.
func (s *Service) awardSeasonPassXP(ctx context.Context, userID uuid.UUID, delta int32) {
	if s.seasonPass == nil || delta <= 0 {
		return
	}
	_ = s.seasonPass.AddXP(ctx, userID, delta)
}

func (s *Service) observeMatchFinished(match *domain.Match, finishedAt time.Time) {
	var durationSeconds float64
	if match.StartedAt != nil {
		durationSeconds = finishedAt.Sub(*match.StartedAt).Seconds()
	}
	metrics.IncMatchesFinished(durationSeconds)
}

func (s *Service) GetActiveSeason(ctx context.Context) (*model.ArenaSeason, error) {
	return s.repo.GetActiveSeason(ctx)
}

func (s *Service) GetLeaguePosition(ctx context.Context, userID string, rating int32) (int32, int32, error) {
	return s.repo.GetLeaguePosition(ctx, userID, rating)
}
