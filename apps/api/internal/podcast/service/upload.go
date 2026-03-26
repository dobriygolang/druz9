package service

import (
	"context"
	"time"

	"api/internal/model"

	"github.com/google/uuid"
)

// CompletePodcastUpload completes podcast upload by updating the record with file metadata.
func (s *Service) CompletePodcastUpload(ctx context.Context, podcastID uuid.UUID, req model.CompletePodcastUploadRequest) (*model.Podcast, error) {
	return s.repo.AttachUpload(ctx, podcastID, model.UploadPodcastRequest{
		FileName:        req.FileName,
		ContentType:     req.ContentType,
		DurationSeconds: req.DurationSeconds,
	}, req.ObjectKey)
}

// PlayPodcast increments listen count and returns podcast with signed URL.
func (s *Service) PlayPodcast(ctx context.Context, podcastID uuid.UUID) (*model.Podcast, string, error) {
	podcast, err := s.repo.IncrementListens(ctx, podcastID)
	if err != nil {
		return nil, "", err
	}

	var url string
	if podcast.ObjectKey != "" {
		url, err = s.storage.PresignGetObject(ctx, podcast.ObjectKey, model.PresignOptions{
			Expiry: 24 * time.Hour,
		})
		if err != nil {
			return nil, "", err
		}
	}

	return podcast, url, nil
}

// UploadPodcast prepares podcast upload by getting presigned URL.
func (s *Service) UploadPodcast(ctx context.Context, podcastID uuid.UUID, req model.UploadPodcastRequest) (*model.Podcast, error) {
	objectKey := "podcasts/" + podcastID.String() + "/" + req.FileName
	_, err := s.storage.PresignPutObject(ctx, objectKey, model.PresignOptions{
		Expiry:        time.Hour,
		ContentType:   req.ContentType,
		ContentLength: req.ContentLength,
	})
	if err != nil {
		return nil, err
	}

	return s.repo.AttachUpload(ctx, podcastID, req, objectKey)
}