package biz

import (
	"context"

	v1 "back/pkg/api/podcast/v1"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/go-kratos/kratos/v2/log"
)

var (
	// ErrPodcastNotFound is podcast not found.
	ErrPodcastNotFound = errors.NotFound(v1.ErrorReason_PODCAST_NOT_FOUND.String(), "podcast not found")
)

// Podcast is a Podcast model.
type Podcast struct {
	ID          string
	Title       string
	Description string
	AudioURL    string
}

// PodcastRepo is a Podcast repo.
type PodcastRepo interface {
	Save(context.Context, *Podcast) (*Podcast, error)
	Update(context.Context, *Podcast) (*Podcast, error)
	FindByID(context.Context, string) (*Podcast, error)
	ListAll(context.Context) ([]*Podcast, error)
}

// PodcastUsecase is a podcast use case.
type PodcastUsecase struct {
	repo PodcastRepo
	log  *log.Helper
}

// NewPodcastUsecase new a podcast usecase.
func NewPodcastUsecase(repo PodcastRepo, logger log.Logger) *PodcastUsecase {
	return &PodcastUsecase{
		repo: repo,
		log:  log.NewHelper(logger),
	}
}

// CreatePodcast creates a podcast.
func (uc *PodcastUsecase) CreatePodcast(ctx context.Context, p *Podcast) (*Podcast, error) {
	uc.log.WithContext(ctx).Infof("CreatePodcast: %v", p)
	return uc.repo.Save(ctx, p)
}

// GetPodcast gets a podcast by ID.
func (uc *PodcastUsecase) GetPodcast(ctx context.Context, id string) (*Podcast, error) {
	return uc.repo.FindByID(ctx, id)
}
