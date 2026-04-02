package geo

import (
	"context"
	"errors"
	"testing"
	"time"

	"api/internal/cache"
	"api/internal/domain/geo/mocks"
	"api/internal/model"

	"github.com/google/uuid"
)

func TestResolve(t *testing.T) {
	t.Parallel()

	t.Run("delegates to resolver", func(t *testing.T) {
		t.Parallel()

		query := "Moscow"
		expectedCandidates := []*model.GeoCandidate{{City: "Moscow", DisplayName: "Moscow, Russia"}}

		mockResolver := mocks.NewResolver(t)
		mockResolver.On("Resolve", context.Background(), query, 5).Return(expectedCandidates, nil).Once()

		svc := NewService(Config{
			Resolver: mockResolver,
		})

		resp, err := svc.Resolve(context.Background(), query)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if len(resp.Candidates) != 1 {
			t.Errorf("expected 1 candidate, got %d", len(resp.Candidates))
		}

		mockResolver.AssertExpectations(t)
	})

	t.Run("returns error when resolver is nil", func(t *testing.T) {
		t.Parallel()

		svc := NewService(Config{
			Resolver: nil,
		})

		_, err := svc.Resolve(context.Background(), "Moscow")
		if err == nil {
			t.Error("expected error, got nil")
		}
	})

	t.Run("returns error for empty query", func(t *testing.T) {
		t.Parallel()

		mockResolver := mocks.NewResolver(t)
		svc := NewService(Config{
			Resolver: mockResolver,
		})

		_, err := svc.Resolve(context.Background(), "   ")
		if err == nil {
			t.Error("expected error for empty query")
		}
	})

	t.Run("propagates resolver error", func(t *testing.T) {
		t.Parallel()

		expectedErr := errors.New("resolver error")
		mockResolver := mocks.NewResolver(t)
		mockResolver.On("Resolve", context.Background(), "Moscow", 5).Return(nil, expectedErr).Once()

		svc := NewService(Config{
			Resolver: mockResolver,
		})

		_, err := svc.Resolve(context.Background(), "Moscow")
		if !errors.Is(err, expectedErr) {
			t.Errorf("expected error %v, got %v", expectedErr, err)
		}

		mockResolver.AssertExpectations(t)
	})

	t.Run("returns error when no candidates found", func(t *testing.T) {
		t.Parallel()

		mockResolver := mocks.NewResolver(t)
		mockResolver.On("Resolve", context.Background(), "UnknownCity12345", 5).Return([]*model.GeoCandidate{}, nil).Once()

		svc := NewService(Config{
			Resolver: mockResolver,
		})

		_, err := svc.Resolve(context.Background(), "UnknownCity12345")
		if err == nil {
			t.Error("expected error for no candidates")
		}

		mockResolver.AssertExpectations(t)
	})
}

func TestCommunityMap(t *testing.T) {
	t.Parallel()

	t.Run("delegates to resolver", func(t *testing.T) {
		t.Parallel()

		userID := uuid.New().String()
		expectedPoints := []*model.CommunityMapPoint{{UserID: userID, Title: "Test Point"}}

		mockResolver := mocks.NewResolver(t)
		mockResolver.On("ListCommunityPoints", context.Background(), userID).Return(expectedPoints, nil).Once()

		svc := NewService(Config{
			Resolver: mockResolver,
		})

		resp, err := svc.CommunityMap(context.Background(), userID)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if len(resp.Points) != 1 {
			t.Errorf("expected 1 point, got %d", len(resp.Points))
		}

		mockResolver.AssertExpectations(t)
	})

	t.Run("returns error when resolver is nil", func(t *testing.T) {
		t.Parallel()

		svc := NewService(Config{
			Resolver: nil,
		})

		_, err := svc.CommunityMap(context.Background(), uuid.New().String())
		if err == nil {
			t.Error("expected error, got nil")
		}
	})

	t.Run("propagates resolver error", func(t *testing.T) {
		t.Parallel()

		expectedErr := errors.New("database error")
		mockResolver := mocks.NewResolver(t)
		userID := uuid.New().String()

		mockResolver.On("ListCommunityPoints", context.Background(), userID).Return(nil, expectedErr).Once()

		svc := NewService(Config{
			Resolver: mockResolver,
		})

		_, err := svc.CommunityMap(context.Background(), userID)
		if !errors.Is(err, expectedErr) {
			t.Errorf("expected error %v, got %v", expectedErr, err)
		}

		mockResolver.AssertExpectations(t)
	})
}

func TestGeoGetAvatarURL(t *testing.T) {
	t.Parallel()

	t.Run("returns empty for empty object key", func(t *testing.T) {
		t.Parallel()

		svc := NewService(Config{})

		url, err := svc.GetAvatarURL(context.Background(), "")
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if url != "" {
			t.Errorf("expected empty url, got %s", url)
		}
	})

	t.Run("returns cached URL if present", func(t *testing.T) {
		t.Parallel()

		objectKey := "avatars/user1.jpg"
		cachedURL := "https://cached.url/avatar"

		avatarCache := cache.NewTTLCache[string](100, 1*time.Hour)
		avatarCache.Set(objectKey, cachedURL, 1*time.Hour)

		svc := NewService(Config{
			AvatarCache: avatarCache,
		})

		url, err := svc.GetAvatarURL(context.Background(), objectKey)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if url != cachedURL {
			t.Errorf("expected cached url %s, got %s", cachedURL, url)
		}
	})

	t.Run("fetches from storage when not cached", func(t *testing.T) {
		t.Parallel()

		objectKey := "avatars/user1.jpg"
		expectedURL := "https://s3.url/avatar"

		mockStorage := mocks.NewStorage(t)
		mockStorage.On("PresignGetObject", context.Background(), objectKey, model.PresignOptions{Expiry: 24 * time.Hour}).Return(expectedURL, nil).Once()

		svc := NewService(Config{
			Storage: mockStorage,
		})

		url, err := svc.GetAvatarURL(context.Background(), objectKey)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if url != expectedURL {
			t.Errorf("expected url %s, got %s", expectedURL, url)
		}

		mockStorage.AssertExpectations(t)
	})

	t.Run("returns error when storage fails", func(t *testing.T) {
		t.Parallel()

		objectKey := "avatars/user1.jpg"
		expectedErr := errors.New("storage error")

		mockStorage := mocks.NewStorage(t)
		mockStorage.On("PresignGetObject", context.Background(), objectKey, model.PresignOptions{Expiry: 24 * time.Hour}).Return("", expectedErr).Once()

		svc := NewService(Config{
			Storage: mockStorage,
		})

		_, err := svc.GetAvatarURL(context.Background(), objectKey)
		if !errors.Is(err, expectedErr) {
			t.Errorf("expected error %v, got %v", expectedErr, err)
		}

		mockStorage.AssertExpectations(t)
	})

	t.Run("caches URL after fetching from storage", func(t *testing.T) {
		t.Parallel()

		objectKey := "avatars/user1.jpg"
		expectedURL := "https://s3.url/avatar"

		mockStorage := mocks.NewStorage(t)
		mockStorage.On("PresignGetObject", context.Background(), objectKey, model.PresignOptions{Expiry: 24 * time.Hour}).Return(expectedURL, nil).Once()

		avatarCache := cache.NewTTLCache[string](100, 1*time.Hour)

		svc := NewService(Config{
			Storage:     mockStorage,
			AvatarCache: avatarCache,
		})

		url, err := svc.GetAvatarURL(context.Background(), objectKey)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if url != expectedURL {
			t.Errorf("expected url %s, got %s", expectedURL, url)
		}

		// Verify it's cached
		cached, ok := avatarCache.Get(objectKey)
		if !ok {
			t.Error("expected url to be cached")
		}
		if cached != expectedURL {
			t.Errorf("expected cached url %s, got %s", expectedURL, cached)
		}

		mockStorage.AssertExpectations(t)
	})
}

func TestEnrichCommunityMapWithAvatarURLs(t *testing.T) {
	t.Parallel()

	t.Run("returns nil for nil response", func(t *testing.T) {
		t.Parallel()

		svc := NewService(Config{})

		err := svc.EnrichCommunityMapWithAvatarURLs(context.Background(), nil)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
	})

	t.Run("returns nil for empty points", func(t *testing.T) {
		t.Parallel()

		svc := NewService(Config{})

		err := svc.EnrichCommunityMapWithAvatarURLs(context.Background(), &model.CommunityMapResponse{Points: nil})
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}

		err = svc.EnrichCommunityMapWithAvatarURLs(context.Background(), &model.CommunityMapResponse{Points: []*model.CommunityMapPoint{}})
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
	})

	t.Run("keeps empty avatar when avatar url is empty", func(t *testing.T) {
		t.Parallel()

		resp := &model.CommunityMapResponse{
			Points: []*model.CommunityMapPoint{
				{UserID: uuid.New().String(), AvatarURL: ""},
			},
		}

		svc := NewService(Config{})

		err := svc.EnrichCommunityMapWithAvatarURLs(context.Background(), resp)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if resp.Points[0].AvatarURL != "" {
			t.Errorf("expected empty avatar url, got %s", resp.Points[0].AvatarURL)
		}
	})

	t.Run("skips full URLs without enrichment", func(t *testing.T) {
		t.Parallel()

		fullURL := "https://example.com/avatar.jpg"

		resp := &model.CommunityMapResponse{
			Points: []*model.CommunityMapPoint{
				{UserID: uuid.New().String(), AvatarURL: fullURL},
			},
		}

		svc := NewService(Config{})

		err := svc.EnrichCommunityMapWithAvatarURLs(context.Background(), resp)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if resp.Points[0].AvatarURL != fullURL {
			t.Errorf("expected avatar url %s, got %s", fullURL, resp.Points[0].AvatarURL)
		}
	})

	t.Run("fetches from storage for s3 keys", func(t *testing.T) {
		t.Parallel()

		objectKey := "avatars/user1.jpg"
		expectedURL := "https://s3.url/avatar"

		mockStorage := mocks.NewStorage(t)
		mockStorage.On("PresignGetObject", context.Background(), objectKey, model.PresignOptions{Expiry: 24 * time.Hour}).Return(expectedURL, nil).Once()

		resp := &model.CommunityMapResponse{
			Points: []*model.CommunityMapPoint{
				{UserID: uuid.New().String(), AvatarURL: objectKey},
			},
		}

		svc := NewService(Config{
			Storage: mockStorage,
		})

		err := svc.EnrichCommunityMapWithAvatarURLs(context.Background(), resp)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if resp.Points[0].AvatarURL != expectedURL {
			t.Errorf("expected avatar url %s, got %s", expectedURL, resp.Points[0].AvatarURL)
		}

		mockStorage.AssertExpectations(t)
	})

	t.Run("uses cached URLs when available", func(t *testing.T) {
		t.Parallel()

		objectKey := "avatars/user1.jpg"
		cachedURL := "https://cached.url/avatar"

		avatarCache := cache.NewTTLCache[string](100, 1*time.Hour)
		avatarCache.Set(objectKey, cachedURL, 1*time.Hour)

		resp := &model.CommunityMapResponse{
			Points: []*model.CommunityMapPoint{
				{UserID: uuid.New().String(), AvatarURL: objectKey},
			},
		}

		svc := NewService(Config{
			AvatarCache: avatarCache,
		})

		err := svc.EnrichCommunityMapWithAvatarURLs(context.Background(), resp)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if resp.Points[0].AvatarURL != cachedURL {
			t.Errorf("expected avatar url %s, got %s", cachedURL, resp.Points[0].AvatarURL)
		}
	})

	t.Run("deduplicates keys before fetching", func(t *testing.T) {
		t.Parallel()

		objectKey := "avatars/user1.jpg"
		expectedURL := "https://s3.url/avatar"

		mockStorage := mocks.NewStorage(t)
		// Should only be called once due to deduplication
		mockStorage.On("PresignGetObject", context.Background(), objectKey, model.PresignOptions{Expiry: 24 * time.Hour}).Return(expectedURL, nil).Once()

		resp := &model.CommunityMapResponse{
			Points: []*model.CommunityMapPoint{
				{UserID: uuid.New().String(), AvatarURL: objectKey},
				{UserID: uuid.New().String(), AvatarURL: objectKey},
			},
		}

		svc := NewService(Config{
			Storage: mockStorage,
		})

		err := svc.EnrichCommunityMapWithAvatarURLs(context.Background(), resp)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}

		mockStorage.AssertExpectations(t)
	})
}
