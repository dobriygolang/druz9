package event

import (
	"context"
	"errors"
	"testing"

	"api/internal/api/event/mocks"
	"api/internal/model"
	commonv1 "api/pkg/api/common/v1"
	v1 "api/pkg/api/event/v1"

	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"
	"google.golang.org/protobuf/types/known/timestamppb"
)

func TestListEvents(t *testing.T) {
	t.Parallel()

	t.Run("delegates to service", func(t *testing.T) {
		t.Parallel()

		user := &model.User{ID: uuid.New(), IsAdmin: true}
		req := &v1.ListEventsRequest{Limit: 10, Offset: 0}
		expectedResp := &model.ListEventsResponse{
			Events:      []*model.Event{{ID: uuid.New(), Title: "Test Event"}},
			Limit:       10,
			Offset:      0,
			TotalCount:  1,
			HasNextPage: false,
		}
		expectedOpts := model.ListEventsOptions{
			Limit:              req.Limit,
			Offset:             req.Offset,
			IncludeAllStatuses: true,
			ViewerID:           &user.ID,
		}

		mockService := mocks.NewService(t)
		mockService.On("ListEvents", mock.Anything, user.ID, expectedOpts).Return(expectedResp, nil).Once()
impl := New(mockService)
		ctx := model.ContextWithAuth(context.Background(), &model.AuthState{User: user})

		resp, err := impl.ListEvents(ctx, req)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if resp == nil {
			t.Fatal("expected response, got nil")
		}
		if len(resp.Events) != 1 {
			t.Errorf("expected 1 event, got %d", len(resp.Events))
		}

		mockService.AssertExpectations(t)
	})

	t.Run("returns error when no user in context", func(t *testing.T) {
		t.Parallel()

		impl := New(nil)

		_, err := impl.ListEvents(context.Background(), &v1.ListEventsRequest{})
		if err == nil {
			t.Error("expected error when no user in context")
		}
	})

	t.Run("propagates service error", func(t *testing.T) {
		t.Parallel()

		user := &model.User{ID: uuid.New(), IsAdmin: true}
		expectedErr := errors.New("database error")
		mockService := mocks.NewService(t)
		mockService.On("ListEvents", mock.Anything, user.ID, mock.Anything).Return(nil, expectedErr).Once()

		impl := New(mockService)
		ctx := model.ContextWithAuth(context.Background(), &model.AuthState{User: user})

		_, err := impl.ListEvents(ctx, &v1.ListEventsRequest{})
		if !errors.Is(err, expectedErr) {
			t.Errorf("expected error %v, got %v", expectedErr, err)
		}
	})
}

func TestCreateEvent(t *testing.T) {
	t.Parallel()

	t.Run("creates event and returns response", func(t *testing.T) {
		t.Parallel()

		user := &model.User{ID: uuid.New(), IsAdmin: true}
		scheduledAt := timestamppb.Now()
		req := &v1.CreateEventRequest{
			Title:       "Test Event",
			PlaceLabel:  "Conference Room",
			Description: "A great event",
			MeetingLink: "https://meet.example.com",
			Region:      "EU",
			Country:     "Germany",
			City:        "Berlin",
			ScheduledAt: scheduledAt,
		}
		expectedEvent := &model.Event{
			ID:        uuid.New(),
			Title:     req.Title,
			CreatorID: user.ID.String(),
			IsCreator: true,
		}
		expectedScheduledAt := scheduledAt.AsTime().UTC()

		mockService := mocks.NewService(t)
		mockService.On(
			"CreateEvent",
			mock.Anything,
			user.ID,
			true,
			mock.MatchedBy(func(actual model.CreateEventRequest) bool {
				if actual.Title != req.Title || actual.PlaceLabel != req.PlaceLabel || actual.Description != req.Description {
					return false
				}
				if actual.MeetingLink != req.MeetingLink || actual.Region != req.Region || actual.Country != req.Country || actual.City != req.City {
					return false
				}
				if actual.Repeat != model.EventRepeatNone || actual.IsPublic != req.IsPublic {
					return false
				}
				if actual.ScheduledAt == nil {
					return false
				}
				return actual.ScheduledAt.Equal(expectedScheduledAt)
			}),
		).Return(expectedEvent, nil).Once()

		impl := New(mockService)
		ctx := model.ContextWithAuth(context.Background(), &model.AuthState{User: user})

		resp, err := impl.CreateEvent(ctx, req)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if resp == nil {
			t.Fatal("expected response, got nil")
		}
		if resp.Event == nil {
			t.Fatal("expected event, got nil")
		}

		mockService.AssertExpectations(t)
	})

	t.Run("passes non admin flag to service", func(t *testing.T) {
		t.Parallel()

		user := &model.User{ID: uuid.New(), IsAdmin: false}
		expectedEvent := &model.Event{ID: uuid.New(), Title: "Test", CreatorID: user.ID.String()}
		mockService := mocks.NewService(t)
		mockService.On(
			"CreateEvent",
			mock.Anything,
			user.ID,
			false,
			mock.MatchedBy(func(actual model.CreateEventRequest) bool {
				return actual.Title == "Test" && actual.ScheduledAt != nil
			}),
		).Return(expectedEvent, nil).Once()

		impl := New(mockService)
		ctx := model.ContextWithAuth(context.Background(), &model.AuthState{User: user})

		resp, err := impl.CreateEvent(ctx, &v1.CreateEventRequest{
			Title:       "Test",
			ScheduledAt: timestamppb.Now(),
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if resp == nil || resp.Event == nil {
			t.Fatal("expected event response")
		}

		mockService.AssertExpectations(t)
	})

	t.Run("returns error when no user in context", func(t *testing.T) {
		t.Parallel()

		impl := New(nil)

		_, err := impl.CreateEvent(context.Background(), &v1.CreateEventRequest{})
		if err == nil {
			t.Error("expected error when no user in context")
		}
	})

	t.Run("allows nil scheduled_at", func(t *testing.T) {
		t.Parallel()

		user := &model.User{ID: uuid.New(), IsAdmin: true}
		expectedEvent := &model.Event{ID: uuid.New(), Title: "Test"}
		mockService := mocks.NewService(t)
		mockService.On(
			"CreateEvent",
			mock.Anything,
			user.ID,
			true,
			mock.MatchedBy(func(actual model.CreateEventRequest) bool {
				return actual.Title == "Test" && actual.ScheduledAt == nil && actual.Repeat == model.EventRepeatNone
			}),
		).Return(expectedEvent, nil).Once()

		impl := New(mockService)
		ctx := model.ContextWithAuth(context.Background(), &model.AuthState{User: user})

		resp, err := impl.CreateEvent(ctx, &v1.CreateEventRequest{
			Title:       "Test",
			ScheduledAt: nil,
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if resp == nil || resp.Event == nil {
			t.Fatal("expected event response")
		}

		mockService.AssertExpectations(t)
	})
}

func TestJoinEvent(t *testing.T) {
	t.Parallel()

	t.Run("joins event and returns response", func(t *testing.T) {
		t.Parallel()

		user := &model.User{ID: uuid.New()}
		eventID := uuid.New()
		req := &v1.JoinEventRequest{EventId: eventID.String()}
		expectedEvent := &model.Event{
			ID:       eventID,
			IsJoined: true,
		}

		mockService := mocks.NewService(t)
		mockService.On("JoinEvent", mock.Anything, eventID, user.ID).Return(expectedEvent, nil).Once()

		impl := New(mockService)
		ctx := model.ContextWithAuth(context.Background(), &model.AuthState{User: user})

		resp, err := impl.JoinEvent(ctx, req)
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

		_, err := impl.JoinEvent(context.Background(), &v1.JoinEventRequest{})
		if err == nil {
			t.Error("expected error when no user in context")
		}
	})
}

func TestLeaveEvent(t *testing.T) {
	t.Parallel()

	t.Run("leaves event and returns status", func(t *testing.T) {
		t.Parallel()

		user := &model.User{ID: uuid.New()}
		eventID := uuid.New()

		mockService := mocks.NewService(t)
		mockService.On("LeaveEvent", mock.Anything, eventID, user.ID).Return(nil).Once()

		impl := New(mockService)
		ctx := model.ContextWithAuth(context.Background(), &model.AuthState{User: user})

		resp, err := impl.LeaveEvent(ctx, &v1.LeaveEventRequest{EventId: eventID.String()})
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

		_, err := impl.LeaveEvent(context.Background(), &v1.LeaveEventRequest{})
		if err == nil {
			t.Error("expected error when no user in context")
		}
	})
}

func TestUpdateEvent(t *testing.T) {
	t.Parallel()

	t.Run("updates event and returns response", func(t *testing.T) {
		t.Parallel()

		user := &model.User{ID: uuid.New()}
		eventID := uuid.New()
		req := &v1.UpdateEventRequest{
			EventId:     eventID.String(),
			Title:       "Updated Event",
			PlaceLabel:  "New Place",
			Description: "Updated description",
			ScheduledAt: timestamppb.Now(),
		}
		expectedEvent := &model.Event{
			ID:        eventID,
			Title:     req.Title,
			IsCreator: true,
		}

		mockService := mocks.NewService(t)
		mockService.On("UpdateEvent", mock.Anything, eventID, user, mock.Anything).Return(expectedEvent, nil).Once()

		impl := New(mockService)
		ctx := model.ContextWithAuth(context.Background(), &model.AuthState{User: user})

		resp, err := impl.UpdateEvent(ctx, req)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if resp == nil {
			t.Error("expected response, got nil")
		}

		mockService.AssertExpectations(t)
	})

	t.Run("returns error for invalid event id", func(t *testing.T) {
		t.Parallel()

		impl := New(nil)
		ctx := model.ContextWithAuth(context.Background(), &model.AuthState{User: &model.User{ID: uuid.New()}})

		_, err := impl.UpdateEvent(ctx, &v1.UpdateEventRequest{EventId: "invalid-uuid"})
		if err == nil {
			t.Error("expected error for invalid event id")
		}
	})

	t.Run("returns error when no user in context", func(t *testing.T) {
		t.Parallel()

		impl := New(nil)

		_, err := impl.UpdateEvent(context.Background(), &v1.UpdateEventRequest{EventId: uuid.New().String()})
		if err == nil {
			t.Error("expected error when no user in context")
		}
	})

	t.Run("propagates service error", func(t *testing.T) {
		t.Parallel()

		user := &model.User{ID: uuid.New()}
		eventID := uuid.New()
		expectedErr := errors.New("not found")
		mockService := mocks.NewService(t)
		mockService.On("UpdateEvent", mock.Anything, eventID, user, mock.Anything).Return(nil, expectedErr).Once()

		impl := New(mockService)
		ctx := model.ContextWithAuth(context.Background(), &model.AuthState{User: user})

		_, err := impl.UpdateEvent(ctx, &v1.UpdateEventRequest{EventId: eventID.String(), ScheduledAt: timestamppb.Now()})
		if !errors.Is(err, expectedErr) {
			t.Errorf("expected error %v, got %v", expectedErr, err)
		}
	})
}

func TestDeleteEvent(t *testing.T) {
	t.Parallel()

	t.Run("deletes event and returns status", func(t *testing.T) {
		t.Parallel()

		user := &model.User{ID: uuid.New()}
		eventID := uuid.New()

		mockService := mocks.NewService(t)
		mockService.On("DeleteEvent", mock.Anything, eventID, user).Return(nil).Once()

		impl := New(mockService)
		ctx := model.ContextWithAuth(context.Background(), &model.AuthState{User: user})

		resp, err := impl.DeleteEvent(ctx, &v1.DeleteEventRequest{EventId: eventID.String()})
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if resp == nil {
			t.Fatal("expected response, got nil")
		}
		if resp.Status != commonv1.OperationStatus_OPERATION_STATUS_OK {
			t.Errorf("expected status 'ok', got %s", resp.Status)
		}

		mockService.AssertExpectations(t)
	})

	t.Run("returns error for invalid event id", func(t *testing.T) {
		t.Parallel()

		impl := New(nil)
		ctx := model.ContextWithAuth(context.Background(), &model.AuthState{User: &model.User{ID: uuid.New()}})

		_, err := impl.DeleteEvent(ctx, &v1.DeleteEventRequest{EventId: "invalid-uuid"})
		if err == nil {
			t.Error("expected error for invalid event id")
		}
	})

	t.Run("returns error when no user in context", func(t *testing.T) {
		t.Parallel()

		impl := New(nil)

		_, err := impl.DeleteEvent(context.Background(), &v1.DeleteEventRequest{EventId: uuid.New().String()})
		if err == nil {
			t.Error("expected error when no user in context")
		}
	})

	t.Run("propagates service error", func(t *testing.T) {
		t.Parallel()

		user := &model.User{ID: uuid.New()}
		eventID := uuid.New()
		expectedErr := errors.New("not found")
		mockService := mocks.NewService(t)
		mockService.On("DeleteEvent", mock.Anything, eventID, user).Return(expectedErr).Once()

		impl := New(mockService)
		ctx := model.ContextWithAuth(context.Background(), &model.AuthState{User: user})

		_, err := impl.DeleteEvent(ctx, &v1.DeleteEventRequest{EventId: eventID.String()})
		if !errors.Is(err, expectedErr) {
			t.Errorf("expected error %v, got %v", expectedErr, err)
		}
	})
}

// MockService is a mock implementation of Service
type MockService struct {
	mock.Mock
}

func (m *MockService) ListEvents(ctx context.Context, userID uuid.UUID, opts model.ListEventsOptions) (*model.ListEventsResponse, error) {
	args := m.Called(ctx, userID, opts)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.ListEventsResponse), args.Error(1)
}

func (m *MockService) CreateEvent(ctx context.Context, userID uuid.UUID, isAdmin bool, req model.CreateEventRequest) (*model.Event, error) {
	args := m.Called(ctx, userID, isAdmin, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.Event), args.Error(1)
}

func (m *MockService) JoinEvent(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) (*model.Event, error) {
	args := m.Called(ctx, eventID, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.Event), args.Error(1)
}

func (m *MockService) LeaveEvent(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) error {
	args := m.Called(ctx, eventID, userID)
	return args.Error(0)
}

func (m *MockService) UpdateEvent(ctx context.Context, eventID uuid.UUID, user *model.User, req model.UpdateEventRequest) (*model.Event, error) {
	args := m.Called(ctx, eventID, user, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.Event), args.Error(1)
}
