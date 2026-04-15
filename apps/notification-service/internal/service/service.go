package service

import (
	"notification-service/internal/data"
	"notification-service/internal/telegram"
)

type Service struct {
	repo     *data.Repo
	telegram *telegram.Client
}

func New(repo *data.Repo, tg *telegram.Client) *Service {
	return &Service{
		repo:     repo,
		telegram: tg,
	}
}
