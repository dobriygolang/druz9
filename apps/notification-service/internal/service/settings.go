package service

import (
	"context"

	"notification-service/internal/data"

	"github.com/google/uuid"
)

func (s *Service) RegisterChat(ctx context.Context, userID uuid.UUID, chatID int64) error {
	return s.repo.RegisterChat(ctx, userID, chatID)
}

func (s *Service) LinkTelegram(ctx context.Context, userID uuid.UUID, telegramID int64) error {
	return s.repo.LinkTelegramToUser(ctx, userID, telegramID)
}

func (s *Service) GetSettings(ctx context.Context, userID uuid.UUID) (*data.UserSettings, error) {
	return s.repo.GetUserSettings(ctx, userID)
}

func (s *Service) UpdateSettings(ctx context.Context, userID uuid.UUID, apply func(s *data.UserSettings)) error {
	settings, err := s.repo.GetUserSettings(ctx, userID)
	if err != nil {
		return err
	}
	apply(settings)
	return s.repo.UpsertUserSettings(ctx, settings)
}

func (s *Service) UpdateGuildSettings(ctx context.Context, userID, guildID uuid.UUID, apply func(s *data.GuildSettings)) error {
	settings, err := s.repo.GetGuildSettings(ctx, userID, guildID)
	if err != nil {
		return err
	}
	apply(settings)
	return s.repo.UpsertGuildSettings(ctx, settings)
}
