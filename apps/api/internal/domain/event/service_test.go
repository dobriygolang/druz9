package event

import (
	"context"
	"errors"
	"testing"

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

	t.Run("rejects invalid repeat", func(t *testing.T) {
		t.Parallel()

		mockRepo := mocks.NewRepository(t)
		svc := NewEventService(Config{
			Repository: mockRepo,
		})

		_, err := svc.CreateEvent(context.Background(), uuid.New(), false, model.CreateEventRequest{
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

		_, err := svc.CreateEvent(context.Background(), uuid.New(), false, model.CreateEventRequest{
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
		mockRepo.On("CreateEvent", context.Background(), creatorID, expectedReq).Return(expectedEvent, nil).Once()

		svc := NewEventService(Config{
			Repository: mockRepo,
		})

		event, err := svc.CreateEvent(context.Background(), creatorID, true, req)
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
