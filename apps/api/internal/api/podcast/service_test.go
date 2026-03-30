package podcast

import (
	"context"
	"errors"
	"testing"

	"api/internal/api/podcast/mocks"
	"api/internal/model"
	v1 "api/pkg/api/podcast/v1"

	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"
)

func TestListPodcasts(t *testing.T) {
	t.Parallel()

	t.Run("delegates to service", func(t *testing.T) {
		t.Parallel()

		req := &v1.ListPodcastsRequest{Limit: 10, Offset: 0}
		expectedResp := &model.ListPodcastsResponse{
			Podcasts:    []*model.Podcast{{ID: uuid.New(), Title: "Test Podcast"}},
			Limit:       10,
			Offset:      0,
			TotalCount:  1,
			HasNextPage: false,
		}

		mockService := mocks.NewService(t)
		mockService.On("ListPodcasts", mock.Anything, model.ListPodcastsOptions{
			Limit:  req.Limit,
			Offset: req.Offset,
		}).Return(expectedResp, nil).Once()

		impl := New(mockService)

		resp, err := impl.ListPodcasts(context.Background(), req)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if resp == nil {
			t.Fatal("expected response, got nil")
		}
		if len(resp.Podcasts) != 1 {
			t.Errorf("expected 1 podcast, got %d", len(resp.Podcasts))
		}

		mockService.AssertExpectations(t)
	})

	t.Run("propagates service error", func(t *testing.T) {
		t.Parallel()

		expectedErr := errors.New("database error")
		mockService := mocks.NewService(t)
		mockService.On("ListPodcasts", mock.Anything, mock.Anything).Return(nil, expectedErr).Once()

		impl := New(mockService)

		_, err := impl.ListPodcasts(context.Background(), &v1.ListPodcastsRequest{})
		if !errors.Is(err, expectedErr) {
			t.Errorf("expected error %v, got %v", expectedErr, err)
		}
	})
}

func TestGetPodcast(t *testing.T) {
	t.Parallel()

	t.Run("delegates to service", func(t *testing.T) {
		t.Parallel()

		podcastID := uuid.New()
		req := &v1.GetPodcastRequest{PodcastId: podcastID.String()}
		expectedPodcast := &model.Podcast{ID: podcastID, Title: "Test Podcast"}

		mockService := mocks.NewService(t)
		mockService.On("GetPodcast", mock.Anything, podcastID).Return(expectedPodcast, nil).Once()

		impl := New(mockService)

		resp, err := impl.GetPodcast(context.Background(), req)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if resp == nil {
			t.Error("expected response, got nil")
		}

		mockService.AssertExpectations(t)
	})

	t.Run("returns error for invalid podcast id", func(t *testing.T) {
		t.Parallel()

		impl := New(nil)

		_, err := impl.GetPodcast(context.Background(), &v1.GetPodcastRequest{PodcastId: "invalid-uuid"})
		if err == nil {
			t.Error("expected error for invalid podcast id")
		}
	})
}

func TestCreatePodcast(t *testing.T) {
	t.Parallel()

	t.Run("creates podcast and returns response", func(t *testing.T) {
		t.Parallel()

		user := &model.User{ID: uuid.New(), IsAdmin: true}
		req := &v1.CreatePodcastRequest{
			Title: "Test Podcast",
		}
		expectedPodcast := &model.Podcast{
			ID:    uuid.New(),
			Title: req.Title,
		}

		mockService := mocks.NewService(t)
		mockService.On("CreatePodcast", mock.Anything, user, mock.Anything).Return(expectedPodcast, nil).Once()

		impl := New(mockService)
		ctx := model.ContextWithAuth(context.Background(), &model.AuthState{User: user})

		resp, err := impl.CreatePodcast(ctx, req)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if resp == nil {
			t.Error("expected response, got nil")
		}

		mockService.AssertExpectations(t)
	})

	t.Run("returns error when no user in context", func(t *testing.T) {
		t.Parallel()

		impl := New(nil)

		_, err := impl.CreatePodcast(context.Background(), &v1.CreatePodcastRequest{})
		if err == nil {
			t.Error("expected error when no user in context")
		}
	})
}

func TestDeletePodcast(t *testing.T) {
	t.Parallel()

	t.Run("deletes podcast and returns status", func(t *testing.T) {
		t.Parallel()

		user := &model.User{ID: uuid.New(), IsAdmin: true}
		podcastID := uuid.New()

		mockService := mocks.NewService(t)
		mockService.On("DeletePodcast", mock.Anything, podcastID).Return("", nil).Once()

		impl := New(mockService)
		ctx := model.ContextWithAuth(context.Background(), &model.AuthState{User: user})

		resp, err := impl.DeletePodcast(ctx, &v1.DeletePodcastRequest{PodcastId: podcastID.String()})
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if resp == nil {
			t.Error("expected response, got nil")
		}

		mockService.AssertExpectations(t)
	})

	t.Run("returns error for invalid podcast id", func(t *testing.T) {
		t.Parallel()

		impl := New(nil)

		_, err := impl.DeletePodcast(context.Background(), &v1.DeletePodcastRequest{PodcastId: "invalid-uuid"})
		if err == nil {
			t.Error("expected error for invalid podcast id")
		}
	})
}

func TestPreparePodcastUpload(t *testing.T) {
	t.Parallel()

	t.Run("prepares upload and returns presigned URL", func(t *testing.T) {
		t.Parallel()

		user := &model.User{ID: uuid.New(), IsAdmin: true}
		podcastID := uuid.New()
		req := &v1.PreparePodcastUploadRequest{
			PodcastId:   podcastID.String(),
			FileName:    "test.mp3",
			ContentType: "audio/mpeg",
		}
		expectedPodcast := &model.Podcast{ID: podcastID}
		presignedURL := "https://storage.example.com/upload/test.mp3"
		objectKey := "podcasts/" + podcastID.String() + "/test.mp3"

		mockService := mocks.NewService(t)
		mockService.On("PreparePodcastUpload", mock.Anything, podcastID, mock.Anything).Return(expectedPodcast, presignedURL, objectKey, nil).Once()

		impl := New(mockService)
		ctx := model.ContextWithAuth(context.Background(), &model.AuthState{User: user})

		resp, err := impl.PreparePodcastUpload(ctx, req)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if resp == nil {
			t.Error("expected response, got nil")
		}

		mockService.AssertExpectations(t)
	})

	t.Run("returns error for invalid podcast id", func(t *testing.T) {
		t.Parallel()

		impl := New(nil)

		_, err := impl.PreparePodcastUpload(context.Background(), &v1.PreparePodcastUploadRequest{PodcastId: "invalid-uuid"})
		if err == nil {
			t.Error("expected error for invalid podcast id")
		}
	})
}

func TestCompletePodcastUpload(t *testing.T) {
	t.Parallel()

	t.Run("completes upload and returns response", func(t *testing.T) {
		t.Parallel()

		user := &model.User{ID: uuid.New(), IsAdmin: true}
		podcastID := uuid.New()
		req := &v1.CompletePodcastUploadRequest{
			PodcastId:       podcastID.String(),
			FileName:        "test.mp3",
			ContentType:     "audio/mpeg",
			DurationSeconds: 300,
		}
		expectedPodcast := &model.Podcast{ID: podcastID}

		mockService := mocks.NewService(t)
		mockService.On("CompletePodcastUpload", mock.Anything, podcastID, mock.Anything).Return(expectedPodcast, nil).Once()

		impl := New(mockService)
		ctx := model.ContextWithAuth(context.Background(), &model.AuthState{User: user})

		resp, err := impl.CompletePodcastUpload(ctx, req)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if resp == nil {
			t.Error("expected response, got nil")
		}

		mockService.AssertExpectations(t)
	})

	t.Run("returns error for invalid podcast id", func(t *testing.T) {
		t.Parallel()

		impl := New(nil)

		_, err := impl.CompletePodcastUpload(context.Background(), &v1.CompletePodcastUploadRequest{PodcastId: "invalid-uuid"})
		if err == nil {
			t.Error("expected error for invalid podcast id")
		}
	})
}

func TestPlayPodcast(t *testing.T) {
	t.Parallel()

	t.Run("increments list count and returns signed URL", func(t *testing.T) {
		t.Parallel()

		podcastID := uuid.New()
		req := &v1.PlayPodcastRequest{PodcastId: podcastID.String()}
		expectedPodcast := &model.Podcast{ID: podcastID, ObjectKey: "podcasts/test.mp3"}
		signedURL := "https://storage.example.com/download/test.mp3"

		mockService := mocks.NewService(t)
		mockService.On("PlayPodcast", mock.Anything, podcastID).Return(expectedPodcast, signedURL, nil).Once()

		impl := New(mockService)

		resp, err := impl.PlayPodcast(context.Background(), req)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if resp == nil {
			t.Fatal("expected response, got nil")
		}
		if resp.StreamUrl != signedURL {
			t.Errorf("expected URL %s, got %s", signedURL, resp.StreamUrl)
		}

		mockService.AssertExpectations(t)
	})

	t.Run("returns error for invalid podcast id", func(t *testing.T) {
		t.Parallel()

		impl := New(nil)

		_, err := impl.PlayPodcast(context.Background(), &v1.PlayPodcastRequest{PodcastId: "invalid-uuid"})
		if err == nil {
			t.Error("expected error for invalid podcast id")
		}
	})

	t.Run("propagates service error", func(t *testing.T) {
		t.Parallel()

		podcastID := uuid.New()
		expectedErr := errors.New("not found")
		mockService := mocks.NewService(t)
		mockService.On("PlayPodcast", mock.Anything, podcastID).Return(nil, "", expectedErr).Once()

		impl := New(mockService)

		_, err := impl.PlayPodcast(context.Background(), &v1.PlayPodcastRequest{PodcastId: podcastID.String()})
		if !errors.Is(err, expectedErr) {
			t.Errorf("expected error %v, got %v", expectedErr, err)
		}
	})
}
