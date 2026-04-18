package podcast

import (
	"context"
	"fmt"

	"api/internal/model"
)

// UploadObject uploads an object to storage.
func (s *Service) UploadObject(ctx context.Context, req model.UploadObjectRequest) error {
	if err := s.storage.UploadObject(ctx, req); err != nil {
		return fmt.Errorf("upload object: %w", err)
	}
	return nil
}

// DeleteObject deletes an object from storage.
func (s *Service) DeleteObject(ctx context.Context, key string) error {
	if err := s.storage.DeleteObject(ctx, key); err != nil {
		return fmt.Errorf("delete object: %w", err)
	}
	return nil
}

// PresignGetObject generates a presigned URL for reading an object.
func (s *Service) PresignGetObject(ctx context.Context, key string, opts model.PresignOptions) (string, error) {
	url, err := s.storage.PresignGetObject(ctx, key, opts)
	if err != nil {
		return "", fmt.Errorf("presign get object: %w", err)
	}
	return url, nil
}

// PresignPutObject generates a presigned URL for uploading an object.
func (s *Service) PresignPutObject(ctx context.Context, key string, opts model.PresignOptions) (string, error) {
	url, err := s.storage.PresignPutObject(ctx, key, opts)
	if err != nil {
		return "", fmt.Errorf("presign put object: %w", err)
	}
	return url, nil
}
