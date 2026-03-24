package service

import (
	"context"

	"back/internal/biz"
	v1 "back/pkg/api/podcast/v1"
)

// PodcastService is a podcast service.
type PodcastService struct {
	v1.UnimplementedPodcastServer

	uc *biz.PodcastUsecase
}

// NewPodcastService new a podcast service.
func NewPodcastService(uc *biz.PodcastUsecase) *PodcastService {
	return &PodcastService{uc: uc}
}

// GetPodcast implements podcast.PodcastServer.
func (s *PodcastService) GetPodcast(ctx context.Context, in *v1.GetPodcastRequest) (*v1.PodcastReply, error) {
	p, err := s.uc.GetPodcast(ctx, in.Id)
	if err != nil {
		return nil, err
	}
	return &v1.PodcastReply{
		Id:          p.ID,
		Title:       p.Title,
		Description: p.Description,
		AudioUrl:    p.AudioURL,
	}, nil
}

// CreatePodcast implements podcast.PodcastServer.
func (s *PodcastService) CreatePodcast(ctx context.Context, in *v1.CreatePodcastRequest) (*v1.PodcastReply, error) {
	p, err := s.uc.CreatePodcast(ctx, &biz.Podcast{
		Title:       in.Title,
		Description: in.Description,
		AudioURL:    in.AudioUrl,
	})
	if err != nil {
		return nil, err
	}
	return &v1.PodcastReply{
		Id:          p.ID,
		Title:       p.Title,
		Description: p.Description,
		AudioUrl:    p.AudioURL,
	}, nil
}
