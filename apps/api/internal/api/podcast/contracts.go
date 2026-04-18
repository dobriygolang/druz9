package podcast

import (
	"context"

	"github.com/google/uuid"

	"api/internal/model"
)

//go:generate mockery --case underscore --name Service --with-expecter --output mocks
type Service interface {
	ListPodcasts(ctx context.Context, opts model.ListPodcastsOptions) (*model.ListPodcastsResponse, error)
	GetPodcast(ctx context.Context, podcastID uuid.UUID) (*model.Podcast, error)
	CreatePodcast(ctx context.Context, user *model.User, req model.CreatePodcastRequest) (*model.Podcast, error)
	UploadPodcast(ctx context.Context, podcastID uuid.UUID, req model.UploadPodcastRequest) (*model.Podcast, error)
	PreparePodcastUpload(ctx context.Context, podcastID uuid.UUID, req model.PreparePodcastUploadRequest) (*model.Podcast, string, string, error)
	CompletePodcastUpload(ctx context.Context, podcastID uuid.UUID, req model.CompletePodcastUploadRequest) (*model.Podcast, error)
	DeletePodcast(ctx context.Context, podcastID uuid.UUID, user *model.User) (string, error)
	PlayPodcast(ctx context.Context, podcastID uuid.UUID) (*model.Podcast, string, error)
}