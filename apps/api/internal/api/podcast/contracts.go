package podcast

import (
	"context"

	"api/internal/model"

	"github.com/google/uuid"
)

//go:generate mockery --case underscore --name Service --with-expecter --output mocks
type Service interface {
	ListPodcasts(context.Context, model.ListPodcastsOptions) (*model.ListPodcastsResponse, error)
	GetPodcast(context.Context, uuid.UUID) (*model.Podcast, error)
	CreatePodcast(context.Context, *model.User, model.CreatePodcastRequest) (*model.Podcast, error)
	UploadPodcast(context.Context, uuid.UUID, model.UploadPodcastRequest) (*model.Podcast, error)
	PreparePodcastUpload(context.Context, uuid.UUID, model.PreparePodcastUploadRequest) (*model.Podcast, string, string, error)
	CompletePodcastUpload(context.Context, uuid.UUID, model.CompletePodcastUploadRequest) (*model.Podcast, error)
	DeletePodcast(context.Context, uuid.UUID, *model.User) (string, error)
	PlayPodcast(context.Context, uuid.UUID) (*model.Podcast, string, error)
}
