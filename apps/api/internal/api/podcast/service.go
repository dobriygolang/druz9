package podcast

import (
	"context"

	"api/internal/model"
	v1 "api/pkg/api/podcast/v1"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
	"google.golang.org/grpc"
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

// Implementation of podcast service.
type Implementation struct {
	v1.UnimplementedPodcastServiceServer
	service Service
}

// New returns new instance of Implementation.
func New(service Service) *Implementation {
	return &Implementation{service: service}
}

// GetDescription returns grpc service description.
func (i *Implementation) GetDescription() grpc.ServiceDesc {
	return v1.PodcastService_ServiceDesc
}

func requireAdmin(ctx context.Context) (*model.User, error) {
	user, err := requireUser(ctx)
	if err != nil {
		return nil, err
	}
	if !user.IsAdmin {
		return nil, errors.Forbidden("FORBIDDEN", "admin access required")
	}
	return user, nil
}

func requireUser(ctx context.Context) (*model.User, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok {
		return nil, errors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}
	return user, nil
}
