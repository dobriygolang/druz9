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

func TestCreateReferral(t *testing.T) {
	t.Parallel()

	t.Run("creates referral and returns response", func(t *testing.T) {
		t.Parallel()

		userID := uuid.New()
		user := &model.User{ID: userID}
		req := &v1.CreateReferralRequest{
			Title:          "Software Engineer",
			Company:        "Test Corp",
			VacancyUrl:     "https://example.com/job",
			Description:    "Great opportunity",
			Experience:     "3+ years",
			Location:       "Remote",
			EmploymentType: v1.EmploymentType_EMPLOYMENT_TYPE_FULL_TIME,
		}
		expectedReferral := &model.Referral{
			ID:      uuid.New(),
			Title:   req.Title,
			Company: req.Company,
			IsOwner: true,
		}

		mockService := mocks.NewService(t)
		mockService.On("CreateReferral", mock.Anything, user, mock.Anything).Return(expectedReferral, nil).Once()

		impl := New(mockService)
		ctx := model.ContextWithAuth(context.Background(), &model.AuthState{User: user})

		resp, err := impl.CreateReferral(ctx, req)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if resp == nil {
			t.Fatal("expected response, got nil")
		}
		if resp.Referral == nil {
			t.Fatal("expected referral, got nil")
		}

		mockService.AssertExpectations(t)
	})

	t.Run("returns error when no user in context", func(t *testing.T) {
		t.Parallel()

		impl := New(nil)

		_, err := impl.CreateReferral(context.Background(), &v1.CreateReferralRequest{})
		if err == nil {
			t.Error("expected error when no user in context")
		}
	})

	t.Run("propagates service error", func(t *testing.T) {
		t.Parallel()

		user := &model.User{ID: uuid.New()}
		expectedErr := errors.New("validation error")
		mockService := mocks.NewService(t)
		mockService.On("CreateReferral", mock.Anything, user, mock.Anything).Return(nil, expectedErr).Once()

		impl := New(mockService)
		ctx := model.ContextWithAuth(context.Background(), &model.AuthState{User: user})

		_, err := impl.CreateReferral(ctx, &v1.CreateReferralRequest{Title: "Test"})
		if !errors.Is(err, expectedErr) {
			t.Errorf("expected error %v, got %v", expectedErr, err)
		}
	})
}

func TestUpdateReferral(t *testing.T) {
	t.Parallel()

	t.Run("updates referral and returns response", func(t *testing.T) {
		t.Parallel()

		user := &model.User{ID: uuid.New()}
		referralID := uuid.New()
		req := &v1.UpdateReferralRequest{
			ReferralId:     referralID.String(),
			Title:          "Senior Engineer",
			Company:        "New Corp",
			VacancyUrl:     "https://example.com/new",
			Description:    "Better opportunity",
			Experience:     "5+ years",
			Location:       "On-site",
			EmploymentType: v1.EmploymentType_EMPLOYMENT_TYPE_CONTRACT,
		}
		expectedReferral := &model.Referral{
			ID:      referralID,
			Title:   req.Title,
			Company: req.Company,
			IsOwner: true,
		}

		mockService := mocks.NewService(t)
		mockService.On("UpdateReferral", mock.Anything, referralID, user, mock.Anything).Return(expectedReferral, nil).Once()

		impl := New(mockService)
		ctx := model.ContextWithAuth(context.Background(), &model.AuthState{User: user})

		resp, err := impl.UpdateReferral(ctx, req)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if resp == nil {
			t.Error("expected response, got nil")
		}

		mockService.AssertExpectations(t)
	})

	t.Run("returns error for invalid referral id", func(t *testing.T) {
		t.Parallel()

		impl := New(nil)
		ctx := model.ContextWithAuth(context.Background(), &model.AuthState{User: &model.User{ID: uuid.New()}})

		_, err := impl.UpdateReferral(ctx, &v1.UpdateReferralRequest{ReferralId: "invalid-uuid"})
		if err == nil {
			t.Error("expected error for invalid referral id")
		}
	})

	t.Run("returns error when no user in context", func(t *testing.T) {
		t.Parallel()

		impl := New(nil)

		_, err := impl.UpdateReferral(context.Background(), &v1.UpdateReferralRequest{ReferralId: uuid.New().String()})
		if err == nil {
			t.Error("expected error when no user in context")
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
