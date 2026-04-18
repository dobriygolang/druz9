package podcast

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"

	"api/internal/model"
)

// CompletePodcastUpload completes podcast upload by updating the record with file metadata.
func (s *Service) CompletePodcastUpload(ctx context.Context, podcastID uuid.UUID, req model.CompletePodcastUploadRequest) (*model.Podcast, error) {
	podcast, err := s.repo.AttachUpload(ctx, podcastID, model.UploadPodcastRequest{
		FileName:        req.FileName,
		ContentType:     req.ContentType,
		DurationSeconds: req.DurationSeconds,
	}, req.ObjectKey)
	if err != nil {
		return nil, fmt.Errorf("attach upload: %w", err)
	}
	return podcast, nil
}

// PlayPodcast increments listen count and returns podcast with signed URL.
func (s *Service) PlayPodcast(ctx context.Context, podcastID uuid.UUID) (*model.Podcast, string, error) {
	podcast, err := s.repo.IncrementListens(ctx, podcastID)
	if err != nil {
		return nil, "", fmt.Errorf("increment listens: %w", err)
	}

	var url string
	if podcast.ObjectKey != "" {
		url, err = s.storage.PresignGetObject(ctx, podcast.ObjectKey, model.PresignOptions{
			Expiry: 24 * time.Hour,
		})
		if err != nil {
			return nil, "", fmt.Errorf("presign get object: %w", err)
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
		return nil, fmt.Errorf("presign put object: %w", err)
	}

	podcast, err := s.repo.AttachUpload(ctx, podcastID, req, objectKey)
	if err != nil {
		return nil, fmt.Errorf("attach upload: %w", err)
	}
	return podcast, nil
}
