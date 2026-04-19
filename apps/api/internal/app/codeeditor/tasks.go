package codeeditor

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"

	domain "api/internal/domain/codeeditor"
)

func (s *Service) ListTasks(ctx context.Context, filter domain.TaskFilter) ([]*domain.Task, error) {
	tasks, err := s.repo.ListTasks(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("list tasks: %w", err)
	}
	return tasks, nil
}

func (s *Service) ListSolvedTasks(ctx context.Context, userID uuid.UUID) ([]*domain.Task, error) {
	tasks, err := s.repo.ListSolvedTasks(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("list solved tasks: %w", err)
	}
	return tasks, nil
}

func (s *Service) GetTask(ctx context.Context, taskID uuid.UUID) (*domain.Task, error) {
	cacheKey := taskID.String()
	if cached, ok := s.taskCache.Get(cacheKey); ok {
		return &cached, nil
	}
	task, err := s.repo.GetTask(ctx, taskID)
	if err != nil {
		return nil, fmt.Errorf("get task: %w", err)
	}
	if task == nil {
		return nil, nil //nolint:nilnil // task not found is valid state
	}
	s.taskCache.Set(cacheKey, *task)
	return task, nil
}

func (s *Service) CreateTask(ctx context.Context, task *domain.Task) (*domain.Task, error) {
	if err := normalizeTaskPolicy(task); err != nil {
		return nil, fmt.Errorf("normalize task policy: %w", err)
	}
	created, err := s.repo.CreateTask(ctx, task)
	if err != nil {
		return nil, fmt.Errorf("create task: %w", err)
	}
	return created, nil
}

func (s *Service) UpdateTask(ctx context.Context, task *domain.Task) (*domain.Task, error) {
	if err := normalizeTaskPolicy(task); err != nil {
		return nil, fmt.Errorf("normalize task policy: %w", err)
	}
	updated, err := s.repo.UpdateTask(ctx, task)
	if err != nil {
		return nil, fmt.Errorf("update task: %w", err)
	}
	s.taskCache.Delete(updated.ID.String())
	return updated, nil
}

func (s *Service) DeleteTask(ctx context.Context, taskID uuid.UUID) error {
	if err := s.repo.DeleteTask(ctx, taskID); err != nil {
		return fmt.Errorf("delete task: %w", err)
	}
	s.taskCache.Delete(taskID.String())
	return nil
}

func (s *Service) GetLeaderboard(ctx context.Context, limit int32) ([]*domain.LeaderboardEntry, error) {
	s.leaderboardMu.Lock()
	cached := s.leaderboardCache
	s.leaderboardMu.Unlock()

	if cached.entries != nil && time.Now().Before(cached.expiresAt) {
		return cached.entries, nil
	}

	entries, err := s.repo.GetLeaderboard(ctx, limit)
	if err != nil {
		return nil, fmt.Errorf("get leaderboard: %w", err)
	}

	s.leaderboardMu.Lock()
	s.leaderboardCache = leaderboardSnapshot{
		entries:   entries,
		expiresAt: time.Now().Add(leaderboardCacheTTL),
	}
	s.leaderboardMu.Unlock()

	return entries, nil
}
