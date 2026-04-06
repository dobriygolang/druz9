package referral

import (
	"context"
	"errors"
	"testing"

	"api/internal/api/referral/mocks"
	"api/internal/model"
	v1 "api/pkg/api/referral/v1"

	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"
)

func TestListReferrals(t *testing.T) {
	t.Parallel()

	t.Run("delegates to service", func(t *testing.T) {
		t.Parallel()

		user := &model.User{ID: uuid.New()}
		req := &v1.ListReferralsRequest{Limit: 10, Offset: 0}
		expectedResp := &model.ListReferralsResponse{
			Referrals:   []*model.Referral{{ID: uuid.New(), Title: "Test"}},
			Limit:       10,
			Offset:      0,
			TotalCount:  1,
			HasNextPage: false,
		}

		mockService := mocks.NewService(t)
		mockService.On("ListReferrals", mock.Anything, user, model.ListReferralsOptions{
			Limit:  req.Limit,
			Offset: req.Offset,
		}).Return(expectedResp, nil).Once()

		impl := New(mockService)
		ctx := model.ContextWithAuth(context.Background(), &model.AuthState{User: user})

		resp, err := impl.ListReferrals(ctx, req)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if resp == nil {
			t.Fatal("expected response, got nil")
		}
		if len(resp.Referrals) != 1 {
			t.Errorf("expected 1 referral, got %d", len(resp.Referrals))
		}

		mockService.AssertExpectations(t)
	})

	t.Run("propagates service error", func(t *testing.T) {
		t.Parallel()

		expectedErr := errors.New("database error")
		mockService := mocks.NewService(t)
		mockService.On("ListReferrals", mock.Anything, mock.Anything, mock.Anything).Return(nil, expectedErr).Once()

		impl := New(mockService)

		_, err := impl.ListReferrals(context.Background(), &v1.ListReferralsRequest{})
		if !errors.Is(err, expectedErr) {
			t.Errorf("expected error %v, got %v", expectedErr, err)
		}
	})
}

func TestDeleteReferral(t *testing.T) {
	t.Parallel()

	t.Run("deletes referral and returns status", func(t *testing.T) {
		t.Parallel()

		user := &model.User{ID: uuid.New()}
		referralID := uuid.New()

		mockService := mocks.NewService(t)
		mockService.On("DeleteReferral", mock.Anything, referralID, user).Return(nil).Once()

		impl := New(mockService)
		ctx := model.ContextWithAuth(context.Background(), &model.AuthState{User: user})

		resp, err := impl.DeleteReferral(ctx, &v1.DeleteReferralRequest{ReferralId: referralID.String()})
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if resp == nil {
			t.Fatal("expected response, got nil")
		}
		if resp.Status != "ok" {
			t.Errorf("expected status 'ok', got %s", resp.Status)
		}

		mockService.AssertExpectations(t)
	})

	t.Run("returns error for invalid referral id", func(t *testing.T) {
		t.Parallel()

		impl := New(nil)
		ctx := model.ContextWithAuth(context.Background(), &model.AuthState{User: &model.User{ID: uuid.New()}})

		_, err := impl.DeleteReferral(ctx, &v1.DeleteReferralRequest{ReferralId: "invalid-uuid"})
		if err == nil {
			t.Error("expected error for invalid referral id")
		}
	})

	t.Run("returns error when no user in context", func(t *testing.T) {
		t.Parallel()

		impl := New(nil)

		_, err := impl.DeleteReferral(context.Background(), &v1.DeleteReferralRequest{ReferralId: uuid.New().String()})
		if err == nil {
			t.Error("expected error when no user in context")
		}
	})

	t.Run("propagates service error", func(t *testing.T) {
		t.Parallel()

		user := &model.User{ID: uuid.New()}
		referralID := uuid.New()
		expectedErr := errors.New("not found")
		mockService := mocks.NewService(t)
		mockService.On("DeleteReferral", mock.Anything, referralID, user).Return(expectedErr).Once()

		impl := New(mockService)
		ctx := model.ContextWithAuth(context.Background(), &model.AuthState{User: user})

		_, err := impl.DeleteReferral(ctx, &v1.DeleteReferralRequest{ReferralId: referralID.String()})
		if !errors.Is(err, expectedErr) {
			t.Errorf("expected error %v, got %v", expectedErr, err)
		}
	})
}
