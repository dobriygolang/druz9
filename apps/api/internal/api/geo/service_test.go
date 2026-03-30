package geo

import (
	"context"
	"errors"
	"testing"

	"api/internal/api/geo/mocks"
	"api/internal/model"
	v1 "api/pkg/api/geo/v1"

	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"
)

func TestResolve(t *testing.T) {
	t.Parallel()

	t.Run("resolves query and returns response", func(t *testing.T) {
		t.Parallel()

		req := &v1.ResolveRequest{Query: "Berlin"}
		expectedResp := &model.GeoResolveResponse{
			Candidates: []*model.GeoCandidate{
				{DisplayName: "Berlin", Country: "Germany"},
			},
		}

		mockService := mocks.NewService(t)
		mockService.On("Resolve", mock.Anything, "Berlin").Return(expectedResp, nil).Once()

		impl := New(mockService)

		resp, err := impl.Resolve(context.Background(), req)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if resp == nil {
			t.Error("expected response, got nil")
		}
		if len(resp.Candidates) != 1 {
			t.Errorf("expected 1 candidate, got %d", len(resp.Candidates))
		}

		mockService.AssertExpectations(t)
	})

	t.Run("returns error for invalid query", func(t *testing.T) {
		t.Parallel()

		mockService := mocks.NewService(t)
		mockService.On("Resolve", mock.Anything, "").Return(nil, errors.New("invalid query")).Once()

		impl := New(mockService)

		_, err := impl.Resolve(context.Background(), &v1.ResolveRequest{Query: ""})
		if err == nil {
			t.Error("expected error for invalid query")
		}
	})
}

func TestCommunityMap(t *testing.T) {
	t.Parallel()

	t.Run("returns community map data", func(t *testing.T) {
		t.Parallel()

		userID := uuid.New()
		user := &model.User{ID: userID}
		req := &v1.CommunityMapRequest{}
		expectedResp := &model.CommunityMapResponse{
			Points: []*model.CommunityMapPoint{
				{Title: "Berlin", Region: "EU"},
			},
		}

		mockService := mocks.NewService(t)
		mockService.On("CommunityMap", mock.Anything, userID.String()).Return(expectedResp, nil).Once()

		impl := New(mockService)
		ctx := model.ContextWithAuth(context.Background(), &model.AuthState{User: user})

		resp, err := impl.CommunityMap(ctx, req)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if resp == nil {
			t.Error("expected response, got nil")
		}

		mockService.AssertExpectations(t)
	})

	t.Run("propagates service error", func(t *testing.T) {
		t.Parallel()

		userID := uuid.New()
		user := &model.User{ID: userID}
		expectedErr := errors.New("database error")
		mockService := mocks.NewService(t)
		mockService.On("CommunityMap", mock.Anything, userID.String()).Return(nil, expectedErr).Once()

		impl := New(mockService)
		ctx := model.ContextWithAuth(context.Background(), &model.AuthState{User: user})

		_, err := impl.CommunityMap(ctx, &v1.CommunityMapRequest{})
		if !errors.Is(err, expectedErr) {
			t.Errorf("expected error %v, got %v", expectedErr, err)
		}
	})
}
