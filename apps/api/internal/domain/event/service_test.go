package event

import (
	"errors"
	"testing"

	"github.com/google/uuid"

	"api/internal/domain/event/mocks"
	"api/internal/model"
)

func TestListEvents(t *testing.T) {
	t.Parallel()

	t.Run("delegates to repository", func(t *testing.T) {
		t.Parallel()

		userID := uuid.New()
		opts := model.ListEventsOptions{Limit: 10}
		expectedResp := &model.ListEventsResponse{Events: []*model.Event{}}

		mockRepo := mocks.NewRepository(t)
		mockRepo.On("ListEvents", t.Context(), userID, opts).Return(expectedResp, nil).Once()

		svc := NewEventService(Config{
			Repository: mockRepo,
		})

		resp, err := svc.ListEvents(t.Context(), userID, opts)
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

		mockRepo.On("ListEvents", t.Context(), userID, model.ListEventsOptions{}).Return(nil, expectedErr).Once()

		svc := NewEventService(Config{
			Repository: mockRepo,
		})

		_, err := svc.ListEvents(t.Context(), userID, model.ListEventsOptions{})
		if !errors.Is(err, expectedErr) {
			t.Errorf("expected error %v, got %v", expectedErr, err)
		}

		mockRepo.AssertExpectations(t)
	})

	t.Run("rejects invalid repeat", func(t *testing.T) {
		t.Parallel()

		mockRepo := mocks.NewRepository(t)
		svc := NewEventService(Config{
			Repository: mockRepo,
		})

		_, err := svc.CreateEvent(t.Context(), uuid.New(), false, model.CreateEventRequest{
			Title:  "Test Event",
			Repeat: "invalid",
		})
		if err == nil {
			t.Fatal("expected error")
		}
	})

	t.Run("requires schedule for repeating events", func(t *testing.T) {
		t.Parallel()

		mockRepo := mocks.NewRepository(t)
		svc := NewEventService(Config{
			Repository: mockRepo,
		})

		_, err := svc.CreateEvent(t.Context(), uuid.New(), false, model.CreateEventRequest{
			Title:  "Test Event",
			Repeat: model.EventRepeatWeekly,
		})
		if err == nil {
			t.Fatal("expected error")
		}
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

		expectedReq := req
		expectedReq.Status = model.EventStatusApproved
		mockRepo := mocks.NewRepository(t)
		mockRepo.On("CreateEvent", t.Context(), creatorID, expectedReq).Return(expectedEvent, nil).Once()

		svc := NewEventService(Config{
			Repository: mockRepo,
		})

		event, err := svc.CreateEvent(t.Context(), creatorID, true, req)
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
		mockRepo.On("JoinEvent", t.Context(), eventID, userID).Return(expectedEvent, nil).Once()

		svc := NewEventService(Config{
			Repository: mockRepo,
		})

		event, err := svc.JoinEvent(t.Context(), eventID, userID)
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
		mockRepo.On("LeaveEvent", t.Context(), eventID, userID).Return(nil).Once()

		svc := NewEventService(Config{
			Repository: mockRepo,
		})

		err := svc.LeaveEvent(t.Context(), eventID, userID)
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
		mockRepo.On("UpdateEvent", t.Context(), eventID, actor, req).Return(expectedEvent, nil).Once()

		svc := NewEventService(Config{
			Repository: mockRepo,
		})

		event, err := svc.UpdateEvent(t.Context(), eventID, actor, req)
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
		mockRepo.On("DeleteEvent", t.Context(), eventID, actor).Return(nil).Once()

		svc := NewEventService(Config{
			Repository: mockRepo,
		})

		err := svc.DeleteEvent(t.Context(), eventID, actor)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}

		mockRepo.AssertExpectations(t)
	})
}
