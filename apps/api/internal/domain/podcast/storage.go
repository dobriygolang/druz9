package podcast

import (
	"context"

	"api/internal/model"
)

// UploadObject uploads an object to storage.
func (s *Service) UploadObject(ctx context.Context, req model.UploadObjectRequest) error {
	return s.storage.UploadObject(ctx, req)
}

// DeleteObject deletes an object from storage.
func (s *Service) DeleteObject(ctx context.Context, key string) error {
	return s.storage.DeleteObject(ctx, key)
}

// PresignGetObject generates a presigned URL for reading an object.
func (s *Service) PresignGetObject(ctx context.Context, key string, opts model.PresignOptions) (string, error) {
	return s.storage.PresignGetObject(ctx, key, opts)
}

// PresignPutObject generates a presigned URL for uploading an object.
func (s *Service) PresignPutObject(ctx context.Context, key string, opts model.PresignOptions) (string, error) {
	return s.storage.PresignPutObject(ctx, key, opts)
}
