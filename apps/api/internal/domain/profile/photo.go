package profile

import (
	"context"
	"fmt"
	"path/filepath"
	"strings"
	"time"

	"api/internal/model"
	"api/internal/util"

	"github.com/google/uuid"
)

type PhotoUploadTarget struct {
	UploadURL string
	PhotoURL  string
	ObjectKey string
}

func (s *Service) PreparePhotoUpload(ctx context.Context, userID string, fileName, contentType string) (*PhotoUploadTarget, error) {
	if s.storage == nil {
		return nil, fmt.Errorf("photo storage is not configured")
	}

	cleanName := sanitizeUploadFileName(fileName)
	objectKey := fmt.Sprintf("profile-photos/%s/%d-%s", userID, time.Now().UnixNano(), cleanName)
	uploadURL, err := s.storage.PresignPutObject(ctx, objectKey, model.PresignOptions{
		Expiry:      15 * time.Minute,
		ContentType: contentType,
	})
	if err != nil {
		return nil, err
	}

	return &PhotoUploadTarget{
		UploadURL: uploadURL,
		ObjectKey: objectKey,
	}, nil
}

func (s *Service) CompletePhotoUpload(ctx context.Context, userID uuid.UUID, objectKey string) (*model.ProfileResponse, error) {
	user, err := s.repo.UpdateAvatarURL(ctx, userID, objectKey)
	if err != nil {
		return nil, err
	}

	// Invalidate and update cache
	s.InvalidateProfileCache(userID)
	s.CacheProfile(userID, user)

	return &model.ProfileResponse{
		User:                 user,
		NeedsProfileComplete: user.Status == model.UserStatusPendingProfile,
	}, nil
}

// GetAvatarURL generates a presigned GET URL for the user's avatar.
func (s *Service) GetAvatarURL(ctx context.Context, objectKey string) (string, error) {
	if objectKey == "" {
		return "", nil
	}

	// If already a full URL (Telegram avatar), return as-is
	if util.IsFullURL(objectKey) {
		return objectKey, nil
	}

	if s.storage == nil {
		return "", nil
	}

	url, err := s.storage.PresignGetObject(ctx, objectKey, model.PresignOptions{
		Expiry: 24 * time.Hour,
	})
	if err != nil {
		return "", err
	}
	return url, nil
}

func sanitizeUploadFileName(fileName string) string {
	fileName = strings.TrimSpace(filepath.Base(fileName))
	if fileName == "" || fileName == "." || fileName == string(filepath.Separator) {
		return "photo"
	}
	return strings.ReplaceAll(fileName, " ", "-")
}