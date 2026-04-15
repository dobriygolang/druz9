package mission

import (
	"context"
	"time"

	"api/internal/model"

	"github.com/google/uuid"
)

// Repository defines the data-layer interface for mission queries.
type Repository interface {
	GetActivityCounts(ctx context.Context, userID uuid.UUID, date time.Time) (*ActivityCounts, error)
	GetCompletions(ctx context.Context, userID uuid.UUID, periodKey string) (map[string]bool, error)
	RecordCompletion(ctx context.Context, userID uuid.UUID, missionKey, periodKey string) error
}

// Service implements mission domain logic.
type Service struct {
	repo Repository
}

// Config holds dependencies for the mission service.
type Config struct {
	Repository Repository
}

// NewService creates a new mission service.
func NewService(c Config) *Service {
	return &Service{repo: c.Repository}
}

// GetDailyMissions returns the 3 daily missions for a user with current progress.
func (s *Service) GetDailyMissions(ctx context.Context, userID uuid.UUID) (*model.DailyMissionsResponse, error) {
	now := time.Now().UTC()
	periodKey := PeriodKeyForDate(now)

	counts, err := s.repo.GetActivityCounts(ctx, userID, now)
	if err != nil {
		return nil, err
	}

	completions, err := s.repo.GetCompletions(ctx, userID, periodKey)
	if err != nil {
		return nil, err
	}

	result := BuildDailyMissions(userID.String(), now, counts, completions)

	// Auto-record completions for missions that are now done
	// (so they persist even if the activity gets cleaned up).
	for _, m := range result.Missions {
		if m.Completed && !completions[m.Key] {
			_ = s.repo.RecordCompletion(ctx, userID, m.Key, periodKey)
		}
	}

	return result, nil
}

// CompleteMission explicitly marks a mission as completed for the current day.
// Used for missions that can't be computed from existing tables (e.g., daily_challenge).
func (s *Service) CompleteMission(ctx context.Context, userID uuid.UUID, missionKey string) error {
	now := time.Now().UTC()
	periodKey := PeriodKeyForDate(now)

	// Validate that this mission key is in the user's current daily selection.
	defs := SelectDailyMissions(userID.String(), now)
	found := false
	for _, def := range defs {
		if def.Key == missionKey {
			found = true
			break
		}
	}
	if !found {
		return nil // silently ignore — mission not in today's selection
	}

	return s.repo.RecordCompletion(ctx, userID, missionKey, periodKey)
}
