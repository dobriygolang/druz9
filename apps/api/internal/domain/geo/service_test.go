package geo

import (
	"context"
	"errors"
	"testing"

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

