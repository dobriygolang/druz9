package event

import (
	"context"
	"errors"
	"testing"
	"time"

	"api/internal/cache"
	"api/internal/domain/event/mocks"
	"api/internal/model"

	"github.com/google/uuid"
)

func TestListEvents(t *testing.T) {
	t.Parallel()

	t.Run("delegates to repository", func(t *testing.T) {
		t.Parallel()

		userID := uuid.New()
		opts := model.ListEventsOptions{Limit: 10}
		expectedResp := &model.ListEventsResponse{Events: []*model.Event{}}

		mockRepo := mocks.NewRepository(t)
		mockRepo.On("ListEvents", context.Background(), userID, opts).Return(expectedResp, nil).Once()

		svc := NewEventService(Config{
			Repository: mockRepo,
		})

		resp, err := svc.ListEvents(context.Background(), userID, opts)
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
		userID := uuid.New()

		mockRepo.On("ListEvents", context.Background(), userID, model.ListEventsOptions{}).Return(nil, expectedErr).Once()

		svc := NewEventService(Config{
			Repository: mockRepo,
		})

		_, err := svc.ListEvents(context.Background(), userID, model.ListEventsOptions{})
		if !errors.Is(err, expectedErr) {
			t.Errorf("expected error %v, got %v", expectedErr, err)
		}

		mockRepo.AssertExpectations(t)
	})
}

func TestCreateEvent(t *testing.T) {
	t.Parallel()

	t.Run("delegates to repository", func(t *testing.T) {
		t.Parallel()

		creatorID := uuid.New()
		req := model.CreateEventRequest{Title: "Test Event"}
		eventID := uuid.New()
		expectedEvent := &model.Event{ID: eventID}

		mockRepo := mocks.NewRepository(t)
		mockRepo.On("CreateEvent", context.Background(), creatorID, req).Return(expectedEvent, nil).Once()

		svc := NewEventService(Config{
			Repository: mockRepo,
		})

		event, err := svc.CreateEvent(context.Background(), creatorID, req)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if event.ID != eventID {
			t.Errorf("expected event ID %s, got %s", eventID, event.ID)
		}

		mockRepo.AssertExpectations(t)
	})
}

func TestJoinEvent(t *testing.T) {
	t.Parallel()

	t.Run("delegates to repository", func(t *testing.T) {
		t.Parallel()

		eventID := uuid.New()
		userID := uuid.New()
		expectedEvent := &model.Event{ID: eventID}

		mockRepo := mocks.NewRepository(t)
		mockRepo.On("JoinEvent", context.Background(), eventID, userID).Return(expectedEvent, nil).Once()

		svc := NewEventService(Config{
			Repository: mockRepo,
		})

		event, err := svc.JoinEvent(context.Background(), eventID, userID)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if event.ID != eventID {
			t.Errorf("expected event ID %s, got %s", eventID, event.ID)
		}

		mockRepo.AssertExpectations(t)
	})
}

func TestLeaveEvent(t *testing.T) {
	t.Parallel()

	t.Run("delegates to repository", func(t *testing.T) {
		t.Parallel()

		eventID := uuid.New()
		userID := uuid.New()

		mockRepo := mocks.NewRepository(t)
		mockRepo.On("LeaveEvent", context.Background(), eventID, userID).Return(nil).Once()

		svc := NewEventService(Config{
			Repository: mockRepo,
		})

		err := svc.LeaveEvent(context.Background(), eventID, userID)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}

		mockRepo.AssertExpectations(t)
	})
}

func TestUpdateEvent(t *testing.T) {
	t.Parallel()

	t.Run("delegates to repository", func(t *testing.T) {
		t.Parallel()

		eventID := uuid.New()
		actorID := uuid.New()
		actor := &model.User{ID: actorID}
		req := model.UpdateEventRequest{Title: "Updated"}
		expectedEvent := &model.Event{ID: eventID}

		mockRepo := mocks.NewRepository(t)
		mockRepo.On("UpdateEvent", context.Background(), eventID, actor, req).Return(expectedEvent, nil).Once()

		svc := NewEventService(Config{
			Repository: mockRepo,
		})

		event, err := svc.UpdateEvent(context.Background(), eventID, actor, req)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if event.ID != eventID {
			t.Errorf("expected event ID %s, got %s", eventID, event.ID)
		}

		mockRepo.AssertExpectations(t)
	})
}

func TestDeleteEvent(t *testing.T) {
	t.Parallel()

	t.Run("delegates to repository", func(t *testing.T) {
		t.Parallel()

		eventID := uuid.New()
		actorID := uuid.New()
		actor := &model.User{ID: actorID}

		mockRepo := mocks.NewRepository(t)
		mockRepo.On("DeleteEvent", context.Background(), eventID, actor).Return(nil).Once()

		svc := NewEventService(Config{
			Repository: mockRepo,
		})

		err := svc.DeleteEvent(context.Background(), eventID, actor)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}

		mockRepo.AssertExpectations(t)
	})
}

func TestGetAvatarURL(t *testing.T) {
	t.Parallel()

	t.Run("returns empty for empty object key", func(t *testing.T) {
		t.Parallel()

		svc := NewEventService(Config{})

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

		svc := NewEventService(Config{
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

		svc := NewEventService(Config{
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

		svc := NewEventService(Config{
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

		svc := NewEventService(Config{
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

func TestEnrichEventsWithAvatarURLs(t *testing.T) {
	t.Parallel()

	t.Run("returns nil for nil response", func(t *testing.T) {
		t.Parallel()

		svc := NewEventService(Config{})

		err := svc.EnrichEventsWithAvatarURLs(context.Background(), nil)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
	})

	t.Run("returns nil for empty events", func(t *testing.T) {
		t.Parallel()

		svc := NewEventService(Config{})

		err := svc.EnrichEventsWithAvatarURLs(context.Background(), &model.ListEventsResponse{Events: nil})
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}

		err = svc.EnrichEventsWithAvatarURLs(context.Background(), &model.ListEventsResponse{Events: []*model.Event{}})
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
	})

	t.Run("uses telegram avatar when avatar url is empty", func(t *testing.T) {
		t.Parallel()

		telegramAvatar := "https://t.me/i/userpic/100/test.jpg"

		resp := &model.ListEventsResponse{
			Events: []*model.Event{
				{
					Participants: []*model.EventParticipant{
						{UserID: uuid.New().String(), AvatarURL: "", TelegramAvatarURL: telegramAvatar},
					},
				},
			},
		}

		svc := NewEventService(Config{})

		err := svc.EnrichEventsWithAvatarURLs(context.Background(), resp)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if resp.Events[0].Participants[0].AvatarURL != telegramAvatar {
			t.Errorf("expected avatar url %s, got %s", telegramAvatar, resp.Events[0].Participants[0].AvatarURL)
		}
	})

	t.Run("skips full URLs without enrichment", func(t *testing.T) {
		t.Parallel()

		fullURL := "https://example.com/avatar.jpg"

		resp := &model.ListEventsResponse{
			Events: []*model.Event{
				{
					Participants: []*model.EventParticipant{
						{UserID: uuid.New().String(), AvatarURL: fullURL},
					},
				},
			},
		}

		svc := NewEventService(Config{})

		err := svc.EnrichEventsWithAvatarURLs(context.Background(), resp)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if resp.Events[0].Participants[0].AvatarURL != fullURL {
			t.Errorf("expected avatar url %s, got %s", fullURL, resp.Events[0].Participants[0].AvatarURL)
		}
	})

	t.Run("fetches from storage for s3 keys", func(t *testing.T) {
		t.Parallel()

		objectKey := "avatars/user1.jpg"
		expectedURL := "https://s3.url/avatar"

		mockStorage := mocks.NewStorage(t)
		mockStorage.On("PresignGetObject", context.Background(), objectKey, model.PresignOptions{Expiry: 24 * time.Hour}).Return(expectedURL, nil).Once()

		resp := &model.ListEventsResponse{
			Events: []*model.Event{
				{
					Participants: []*model.EventParticipant{
						{UserID: uuid.New().String(), AvatarURL: objectKey},
					},
				},
			},
		}

		svc := NewEventService(Config{
			Storage: mockStorage,
		})

		err := svc.EnrichEventsWithAvatarURLs(context.Background(), resp)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if resp.Events[0].Participants[0].AvatarURL != expectedURL {
			t.Errorf("expected avatar url %s, got %s", expectedURL, resp.Events[0].Participants[0].AvatarURL)
		}

		mockStorage.AssertExpectations(t)
	})

	t.Run("uses cached URLs when available", func(t *testing.T) {
		t.Parallel()

		objectKey := "avatars/user1.jpg"
		cachedURL := "https://cached.url/avatar"

		avatarCache := cache.NewTTLCache[string](100, 1*time.Hour)
		avatarCache.Set(objectKey, cachedURL, 1*time.Hour)

		resp := &model.ListEventsResponse{
			Events: []*model.Event{
				{
					Participants: []*model.EventParticipant{
						{UserID: uuid.New().String(), AvatarURL: objectKey},
					},
				},
			},
		}

		svc := NewEventService(Config{
			AvatarCache: avatarCache,
		})

		err := svc.EnrichEventsWithAvatarURLs(context.Background(), resp)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if resp.Events[0].Participants[0].AvatarURL != cachedURL {
			t.Errorf("expected avatar url %s, got %s", cachedURL, resp.Events[0].Participants[0].AvatarURL)
		}
	})

	t.Run("deduplicates keys before fetching", func(t *testing.T) {
		t.Parallel()

		objectKey := "avatars/user1.jpg"
		expectedURL := "https://s3.url/avatar"

		mockStorage := mocks.NewStorage(t)
		// Should only be called once due to deduplication
		mockStorage.On("PresignGetObject", context.Background(), objectKey, model.PresignOptions{Expiry: 24 * time.Hour}).Return(expectedURL, nil).Once()

		resp := &model.ListEventsResponse{
			Events: []*model.Event{
				{
					Participants: []*model.EventParticipant{
						{UserID: uuid.New().String(), AvatarURL: objectKey},
						{UserID: uuid.New().String(), AvatarURL: objectKey},
					},
				},
			},
		}

		svc := NewEventService(Config{
			Storage: mockStorage,
		})

		err := svc.EnrichEventsWithAvatarURLs(context.Background(), resp)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}

		mockStorage.AssertExpectations(t)
	})
}
