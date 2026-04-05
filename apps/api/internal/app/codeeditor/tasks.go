package codeeditor

import (
	"context"

	domain "api/internal/domain/codeeditor"

	"github.com/google/uuid"
)

func (s *Service) ListTasks(ctx context.Context, filter domain.TaskFilter) ([]*domain.Task, error) {
	return s.repo.ListTasks(ctx, filter)
}

func (s *Service) GetTask(ctx context.Context, taskID uuid.UUID) (*domain.Task, error) {
	cacheKey := taskID.String()
	if cached, ok := s.taskCache.Get(cacheKey); ok {
		return &cached, nil
	}
	task, err := s.repo.GetTask(ctx, taskID)
	if err != nil {
		return nil, err
	}
	s.taskCache.Set(cacheKey, *task, 0)
	return task, nil
}

func (s *Service) CreateTask(ctx context.Context, task *domain.Task) (*domain.Task, error) {
	if err := normalizeTaskPolicy(task); err != nil {
		return nil, err
	}
	return s.repo.CreateTask(ctx, task)
}

func (s *Service) UpdateTask(ctx context.Context, task *domain.Task) (*domain.Task, error) {
	if err := normalizeTaskPolicy(task); err != nil {
		return nil, err
	}
	updated, err := s.repo.UpdateTask(ctx, task)
	if err != nil {
		return nil, err
	}
	s.taskCache.Delete(updated.ID.String())
	return updated, nil
}

func (s *Service) DeleteTask(ctx context.Context, taskID uuid.UUID) error {
	if err := s.repo.DeleteTask(ctx, taskID); err != nil {
		return err
	}
	s.taskCache.Delete(taskID.String())
	return nil
}

func (s *Service) GetLeaderboard(ctx context.Context, limit int32) ([]*domain.LeaderboardEntry, error) {
	return s.repo.GetLeaderboard(ctx, limit)
}
