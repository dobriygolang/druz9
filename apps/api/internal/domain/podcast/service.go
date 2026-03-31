package podcast

import (
	"context"

	"api/internal/model"

	"github.com/google/uuid"
)

// Config represents podcast domain service configuration.
type Config struct {
	Repository Repository
	Storage    Storage
}

// Service implements podcast domain logic.
type Service struct {
	repo    Repository
	storage Storage
}

// Repository is a data-layer interface for podcast queries.
//
//go:generate mockery --case underscore --name Repository --with-expecter --output mocks
type Repository interface {
	ListPodcasts(ctx context.Context, opts model.ListPodcastsOptions) (*model.ListPodcastsResponse, error)
	GetPodcast(ctx context.Context, podcastID uuid.UUID) (*model.Podcast, error)
	CreatePodcast(ctx context.Context, user *model.User, req model.CreatePodcastRequest) (*model.Podcast, error)
	AttachUpload(ctx context.Context, podcastID uuid.UUID, req model.UploadPodcastRequest, objectKey string) (*model.Podcast, error)
	DeletePodcast(ctx context.Context, podcastID uuid.UUID, actor *model.User) (string, error)
	IncrementListens(ctx context.Context, podcastID uuid.UUID) (*model.Podcast, error)
}

// Storage handles object storage operations.
//
//go:generate mockery --case underscore --name Storage --with-expecter --output mocks
type Storage interface {
	UploadObject(ctx context.Context, req model.UploadObjectRequest) error
	DeleteObject(ctx context.Context, key string) error
	PresignGetObject(ctx context.Context, key string, opts model.PresignOptions) (string, error)
	PresignPutObject(ctx context.Context, key string, opts model.PresignOptions) (string, error)
}

// NewPodcastService creates new podcast domain service.
func NewPodcastService(c Config) *Service {
	return &Service{
		repo:    c.Repository,
		storage: c.Storage,
	}
}
