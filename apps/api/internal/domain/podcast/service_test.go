package podcast

import (
	"context"
	"errors"
	"testing"
	"time"

	"api/internal/model"
	"api/internal/domain/podcast/mocks"

	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"
)

func TestListPodcasts(t *testing.T) {
	t.Parallel()

	t.Run("delegates to repository", func(t *testing.T) {
		t.Parallel()

		opts := model.ListPodcastsOptions{Limit: 10}
		expectedResp := &model.ListPodcastsResponse{Podcasts: []*model.Podcast{}}

		mockRepo := mocks.NewRepository(t)
		mockRepo.On("ListPodcasts", context.Background(), opts).Return(expectedResp, nil).Once()

		svc := NewPodcastService(Config{
			Repository: mockRepo,
		})

		resp, err := svc.ListPodcasts(context.Background(), opts)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if resp != expectedResp {
			t.Errorf("expected response %v, got %v", expectedResp, resp)
		}

		mockRepo.AssertExpectations(t)
	})

	t.Run("propagates repository error", func(t *testing.T) {
		t.Parallel()

		expectedErr := errors.New("database error")
		mockRepo := mocks.NewRepository(t)

		mockRepo.On("ListPodcasts", context.Background(), model.ListPodcastsOptions{}).Return(nil, expectedErr).Once()

		svc := NewPodcastService(Config{
			Repository: mockRepo,
		})

		_, err := svc.ListPodcasts(context.Background(), model.ListPodcastsOptions{})
		if !errors.Is(err, expectedErr) {
			t.Errorf("expected error %v, got %v", expectedErr, err)
		}

		mockRepo.AssertExpectations(t)
	})
}

func TestGetPodcast(t *testing.T) {
	t.Parallel()

	t.Run("delegates to repository", func(t *testing.T) {
		t.Parallel()

		podcastID := uuid.New()
		expectedPodcast := &model.Podcast{ID: podcastID}

		mockRepo := mocks.NewRepository(t)
		mockRepo.On("GetPodcast", context.Background(), podcastID).Return(expectedPodcast, nil).Once()

		svc := NewPodcastService(Config{
			Repository: mockRepo,
		})

		podcast, err := svc.GetPodcast(context.Background(), podcastID)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if podcast.ID != podcastID {
			t.Errorf("expected podcast ID %s, got %s", podcastID, podcast.ID)
		}

		mockRepo.AssertExpectations(t)
	})

	t.Run("propagates repository error", func(t *testing.T) {
		t.Parallel()

		expectedErr := errors.New("not found")
		mockRepo := mocks.NewRepository(t)
		podcastID := uuid.New()

		mockRepo.On("GetPodcast", context.Background(), podcastID).Return(nil, expectedErr).Once()

		svc := NewPodcastService(Config{
			Repository: mockRepo,
		})

		_, err := svc.GetPodcast(context.Background(), podcastID)
		if !errors.Is(err, expectedErr) {
			t.Errorf("expected error %v, got %v", expectedErr, err)
		}

		mockRepo.AssertExpectations(t)
	})
}

func TestCreatePodcast(t *testing.T) {
	t.Parallel()

	t.Run("delegates to repository", func(t *testing.T) {
		t.Parallel()

		user := &model.User{ID: uuid.New()}
		req := model.CreatePodcastRequest{Title: "Test Podcast"}
		expectedPodcast := &model.Podcast{ID: uuid.New()}

		mockRepo := mocks.NewRepository(t)
		mockRepo.On("CreatePodcast", context.Background(), user, req).Return(expectedPodcast, nil).Once()

		svc := NewPodcastService(Config{
			Repository: mockRepo,
		})

		podcast, err := svc.CreatePodcast(context.Background(), user, req)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if podcast.ID != expectedPodcast.ID {
			t.Errorf("expected podcast ID %s, got %s", expectedPodcast.ID, podcast.ID)
		}

		mockRepo.AssertExpectations(t)
	})
}

func TestDeletePodcast(t *testing.T) {
	t.Parallel()

	t.Run("delegates to repository", func(t *testing.T) {
		t.Parallel()

		podcastID := uuid.New()

		mockRepo := mocks.NewRepository(t)
		mockRepo.On("DeletePodcast", context.Background(), podcastID).Return("", nil).Once()

		svc := NewPodcastService(Config{
			Repository: mockRepo,
		})

		_, err := svc.DeletePodcast(context.Background(), podcastID)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}

		mockRepo.AssertExpectations(t)
	})
}

func TestIncrementListens(t *testing.T) {
	t.Parallel()

	t.Run("delegates to repository", func(t *testing.T) {
		t.Parallel()

		podcastID := uuid.New()
		expectedPodcast := &model.Podcast{ID: podcastID, ListensCount: 1}

		mockRepo := mocks.NewRepository(t)
		mockRepo.On("IncrementListens", context.Background(), podcastID).Return(expectedPodcast, nil).Once()

		svc := NewPodcastService(Config{
			Repository: mockRepo,
		})

		podcast, err := svc.IncrementListens(context.Background(), podcastID)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if podcast.ListensCount != 1 {
			t.Errorf("expected 1 listen, got %d", podcast.ListensCount)
		}

		mockRepo.AssertExpectations(t)
	})
}

func TestPreparePodcastUpload(t *testing.T) {
	t.Parallel()

	t.Run("prepares upload and returns presigned URL", func(t *testing.T) {
		t.Parallel()

		podcastID := uuid.New()
		req := model.PreparePodcastUploadRequest{
			FileName:    "test.mp3",
			ContentType: "audio/mpeg",
		}
		expectedPodcast := &model.Podcast{ID: podcastID, ObjectKey: "podcasts/" + podcastID.String() + "/test.mp3"}
		uploadURL := "https://storage.example.com/upload/test.mp3"

		mockRepo := mocks.NewRepository(t)
		mockRepo.On("AttachUpload", context.Background(), podcastID, model.UploadPodcastRequest{
			FileName:    req.FileName,
			ContentType: req.ContentType,
		}, mock.AnythingOfType("string")).Return(expectedPodcast, nil).Once()

		mockStorage := mocks.NewStorage(t)
		mockStorage.On("PresignPutObject", context.Background(), mock.AnythingOfType("string"), model.PresignOptions{
			Expiry:      time.Hour,
			ContentType: req.ContentType,
		}).Return(uploadURL, nil).Once()

		svc := NewPodcastService(Config{
			Repository: mockRepo,
			Storage:    mockStorage,
		})

		podcast, presignedURL, objectKey, err := svc.PreparePodcastUpload(context.Background(), podcastID, req)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if podcast == nil {
			t.Error("expected podcast, got nil")
		}
		if presignedURL == "" {
			t.Error("expected presigned URL, got empty string")
		}
		if objectKey == "" {
			t.Error("expected object key, got empty string")
		}

		mockRepo.AssertExpectations(t)
		mockStorage.AssertExpectations(t)
	})

	t.Run("propagates storage error", func(t *testing.T) {
		t.Parallel()

		expectedErr := errors.New("storage error")
		mockStorage := mocks.NewStorage(t)
		mockStorage.On("PresignPutObject", context.Background(), mock.AnythingOfType("string"), mock.AnythingOfType("model.PresignOptions")).Return("", expectedErr).Once()

		svc := NewPodcastService(Config{
			Storage: mockStorage,
		})

		_, _, _, err := svc.PreparePodcastUpload(context.Background(), uuid.New(), model.PreparePodcastUploadRequest{})
		if !errors.Is(err, expectedErr) {
			t.Errorf("expected error %v, got %v", expectedErr, err)
		}
	})
}

func TestUploadPodcast(t *testing.T) {
	t.Parallel()

	t.Run("uploads podcast and attaches to record", func(t *testing.T) {
		t.Parallel()

		podcastID := uuid.New()
		req := model.UploadPodcastRequest{
			FileName:    "test.mp3",
			ContentType: "audio/mpeg",
		}
		expectedPodcast := &model.Podcast{ID: podcastID}

		mockRepo := mocks.NewRepository(t)
		mockRepo.On("AttachUpload", context.Background(), podcastID, req, mock.AnythingOfType("string")).Return(expectedPodcast, nil).Once()

		mockStorage := mocks.NewStorage(t)
		mockStorage.On("PresignPutObject", context.Background(), mock.AnythingOfType("string"), model.PresignOptions{
			Expiry:        time.Hour,
			ContentType:   req.ContentType,
			ContentLength: req.ContentLength,
		}).Return("https://storage.example.com/upload", nil).Once()

		svc := NewPodcastService(Config{
			Repository: mockRepo,
			Storage:    mockStorage,
		})

		podcast, err := svc.UploadPodcast(context.Background(), podcastID, req)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if podcast.ID != podcastID {
			t.Errorf("expected podcast ID %s, got %s", podcastID, podcast.ID)
		}

		mockRepo.AssertExpectations(t)
		mockStorage.AssertExpectations(t)
	})
}

func TestCompletePodcastUpload(t *testing.T) {
	t.Parallel()

	t.Run("completes upload by attaching metadata", func(t *testing.T) {
		t.Parallel()

		podcastID := uuid.New()
		req := model.CompletePodcastUploadRequest{
			FileName:        "test.mp3",
			ContentType:     "audio/mpeg",
			DurationSeconds: 300,
			ObjectKey:       "podcasts/" + podcastID.String() + "/test.mp3",
		}
		expectedPodcast := &model.Podcast{ID: podcastID, ObjectKey: req.ObjectKey}

		mockRepo := mocks.NewRepository(t)
		mockRepo.On("AttachUpload", context.Background(), podcastID, model.UploadPodcastRequest{
			FileName:        req.FileName,
			ContentType:     req.ContentType,
			DurationSeconds: req.DurationSeconds,
		}, req.ObjectKey).Return(expectedPodcast, nil).Once()

		svc := NewPodcastService(Config{
			Repository: mockRepo,
		})

		podcast, err := svc.CompletePodcastUpload(context.Background(), podcastID, req)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if podcast.ID != podcastID {
			t.Errorf("expected podcast ID %s, got %s", podcastID, podcast.ID)
		}

		mockRepo.AssertExpectations(t)
	})
}

func TestPlayPodcast(t *testing.T) {
	t.Parallel()

	t.Run("increments list count and returns signed URL", func(t *testing.T) {
		t.Parallel()

		podcastID := uuid.New()
		expectedPodcast := &model.Podcast{ID: podcastID, ObjectKey: "podcasts/test.mp3"}
		signedURL := "https://storage.example.com/download/test.mp3"

		mockRepo := mocks.NewRepository(t)
		mockRepo.On("IncrementListens", context.Background(), podcastID).Return(expectedPodcast, nil).Once()

		mockStorage := mocks.NewStorage(t)
		mockStorage.On("PresignGetObject", context.Background(), "podcasts/test.mp3", model.PresignOptions{
			Expiry: 24 * time.Hour,
		}).Return(signedURL, nil).Once()

		svc := NewPodcastService(Config{
			Repository: mockRepo,
			Storage:    mockStorage,
		})

		podcast, url, err := svc.PlayPodcast(context.Background(), podcastID)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if podcast == nil {
			t.Error("expected podcast, got nil")
		}
		if url != signedURL {
			t.Errorf("expected URL %s, got %s", signedURL, url)
		}

		mockRepo.AssertExpectations(t)
		mockStorage.AssertExpectations(t)
	})

	t.Run("returns empty URL when no object key", func(t *testing.T) {
		t.Parallel()

		podcastID := uuid.New()
		expectedPodcast := &model.Podcast{ID: podcastID, ObjectKey: ""}

		mockRepo := mocks.NewRepository(t)
		mockRepo.On("IncrementListens", context.Background(), podcastID).Return(expectedPodcast, nil).Once()

		svc := NewPodcastService(Config{
			Repository: mockRepo,
		})

		_, url, err := svc.PlayPodcast(context.Background(), podcastID)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if url != "" {
			t.Errorf("expected empty URL, got %s", url)
		}
	})

	t.Run("propagates repository error", func(t *testing.T) {
		t.Parallel()

		expectedErr := errors.New("not found")
		mockRepo := mocks.NewRepository(t)
		mockRepo.On("IncrementListens", context.Background(), mock.AnythingOfType("uuid.UUID")).Return(nil, expectedErr).Once()

		svc := NewPodcastService(Config{
			Repository: mockRepo,
		})

		_, _, err := svc.PlayPodcast(context.Background(), uuid.New())
		if !errors.Is(err, expectedErr) {
			t.Errorf("expected error %v, got %v", expectedErr, err)
		}
	})
}