package service

import (
	"context"
	"time"

	"api/internal/model"

	"github.com/google/uuid"
)

// PreparePodcastUpload prepares podcast upload by creating presigned URL and updating podcast.
func (s *Service) PreparePodcastUpload(ctx context.Context, podcastID uuid.UUID, req model.PreparePodcastUploadRequest) (*model.Podcast, string, string, error) {
	objectKey := "podcasts/" + podcastID.String() + "/" + req.FileName
	uploadURL, err := s.storage.PresignPutObject(ctx, objectKey, model.PresignOptions{
		Expiry:      time.Hour,
		ContentType: req.ContentType,
	})
	if err != nil {
		return nil, "", "", err
	}

	podcast, err := s.repo.AttachUpload(ctx, podcastID, model.UploadPodcastRequest{
		FileName:        req.FileName,
		ContentType:     req.ContentType,
		DurationSeconds: req.DurationSeconds,
	}, objectKey)
	if err != nil {
		return nil, "", "", err
	}

	return podcast, uploadURL, objectKey, nil
}
