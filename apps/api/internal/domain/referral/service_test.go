package referral

import (
	"context"
	"errors"
	"testing"

	"api/internal/domain/referral/mocks"
	"api/internal/model"

	"github.com/google/uuid"
)

func TestListReferrals(t *testing.T) {
	t.Parallel()

	t.Run("delegates to repository", func(t *testing.T) {
		t.Parallel()

		user := &model.User{ID: uuid.New()}
		opts := model.ListReferralsOptions{Limit: 10}
		expectedResp := &model.ListReferralsResponse{Referrals: []*model.Referral{}}

		mockRepo := mocks.NewRepository(t)
		mockRepo.On("ListReferrals", context.Background(), user, opts).Return(expectedResp, nil).Once()

		svc := NewReferralService(Config{
			Repository: mockRepo,
		})

		resp, err := svc.ListReferrals(context.Background(), user, opts)
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

		mockRepo.On("ListReferrals", context.Background(), &model.User{ID: userID}, model.ListReferralsOptions{}).Return(nil, expectedErr).Once()

		svc := NewReferralService(Config{
			Repository: mockRepo,
		})

		_, err := svc.ListReferrals(context.Background(), &model.User{ID: userID}, model.ListReferralsOptions{})
		if !errors.Is(err, expectedErr) {
			t.Errorf("expected error %v, got %v", expectedErr, err)
		}

		mockRepo.AssertExpectations(t)
	})
}

func TestCreateReferral(t *testing.T) {
	t.Parallel()

	t.Run("delegates to repository", func(t *testing.T) {
		t.Parallel()

		user := &model.User{ID: uuid.New()}
		req := model.CreateReferralRequest{Title: "Software Engineer", Company: "Tech Corp"}
		expectedReferral := &model.Referral{ID: uuid.New()}

		mockRepo := mocks.NewRepository(t)
		mockRepo.On("CreateReferral", context.Background(), user, req).Return(expectedReferral, nil).Once()

		svc := NewReferralService(Config{
			Repository: mockRepo,
		})

		referral, err := svc.CreateReferral(context.Background(), user, req)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if referral != expectedReferral {
			t.Errorf("expected referral %v, got %v", expectedReferral, referral)
		}

		mockRepo.AssertExpectations(t)
	})

	t.Run("propagates repository error", func(t *testing.T) {
		t.Parallel()

		expectedErr := errors.New("database error")
		mockRepo := mocks.NewRepository(t)
		userID := uuid.New()

		mockRepo.On("CreateReferral", context.Background(), &model.User{ID: userID}, model.CreateReferralRequest{}).Return(nil, expectedErr).Once()

		svc := NewReferralService(Config{
			Repository: mockRepo,
		})

		_, err := svc.CreateReferral(context.Background(), &model.User{ID: userID}, model.CreateReferralRequest{})
		if !errors.Is(err, expectedErr) {
			t.Errorf("expected error %v, got %v", expectedErr, err)
		}

		mockRepo.AssertExpectations(t)
	})
}

func TestUpdateReferral(t *testing.T) {
	t.Parallel()

	t.Run("delegates to repository", func(t *testing.T) {
		t.Parallel()

		referralID := uuid.New()
		user := &model.User{ID: uuid.New()}
		req := model.UpdateReferralRequest{Title: "Updated Title"}
		expectedReferral := &model.Referral{ID: referralID}

		mockRepo := mocks.NewRepository(t)
		mockRepo.On("UpdateReferral", context.Background(), referralID, user, req).Return(expectedReferral, nil).Once()

		svc := NewReferralService(Config{
			Repository: mockRepo,
		})

		referral, err := svc.UpdateReferral(context.Background(), referralID, user, req)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if referral != expectedReferral {
			t.Errorf("expected referral %v, got %v", expectedReferral, referral)
		}

		mockRepo.AssertExpectations(t)
	})
}

func TestDeleteReferral(t *testing.T) {
	t.Parallel()

	t.Run("delegates to repository", func(t *testing.T) {
		t.Parallel()

		referralID := uuid.New()
		user := &model.User{ID: uuid.New()}

		mockRepo := mocks.NewRepository(t)
		mockRepo.On("DeleteReferral", context.Background(), referralID, user).Return(nil).Once()

		svc := NewReferralService(Config{
			Repository: mockRepo,
		})

		err := svc.DeleteReferral(context.Background(), referralID, user)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}

		mockRepo.AssertExpectations(t)
	})

	t.Run("propagates repository error", func(t *testing.T) {
		t.Parallel()

		expectedErr := errors.New("forbidden")
		mockRepo := mocks.NewRepository(t)
		referralID := uuid.New()
		userID := uuid.New()

		mockRepo.On("DeleteReferral", context.Background(), referralID, &model.User{ID: userID}).Return(expectedErr).Once()

		svc := NewReferralService(Config{
			Repository: mockRepo,
		})

		err := svc.DeleteReferral(context.Background(), referralID, &model.User{ID: userID})
		if !errors.Is(err, expectedErr) {
			t.Errorf("expected error %v, got %v", expectedErr, err)
		}

		mockRepo.AssertExpectations(t)
	})
}
