package codeeditor

import (
	"context"

	domain "api/internal/domain/codeeditor"

	"github.com/google/uuid"
)

func (s *Service) ListTasks(ctx context.Context, filter domain.TaskFilter) ([]*domain.Task, error) {
	return s.repo.ListTasks(ctx, filter)
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
	return s.repo.UpdateTask(ctx, task)
}

func (s *Service) DeleteTask(ctx context.Context, taskID uuid.UUID) error {
	return s.repo.DeleteTask(ctx, taskID)
}

func (s *Service) GetTask(ctx context.Context, taskID uuid.UUID) (*domain.Task, error) {
	return s.repo.GetTask(ctx, taskID)
}

func (s *Service) GetLeaderboard(ctx context.Context, limit int32) ([]*domain.LeaderboardEntry, error) {
	return s.repo.GetLeaderboard(ctx, limit)
}
