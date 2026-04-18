package referral

import (
	"errors"
	"testing"

	"github.com/google/uuid"

	"api/internal/domain/referral/mocks"
	"api/internal/model"
)

func TestListReferrals(t *testing.T) {
	t.Parallel()

	t.Run("delegates to repository", func(t *testing.T) {
		t.Parallel()

		user := &model.User{ID: uuid.New()}
		opts := model.ListReferralsOptions{Limit: 10}
		expectedResp := &model.ListReferralsResponse{Referrals: []*model.Referral{}}

		mockRepo := mocks.NewRepository(t)
		mockRepo.On("ListReferrals", t.Context(), user, opts).Return(expectedResp, nil).Once()

		svc := NewReferralService(Config{
			Repository: mockRepo,
		})

		resp, err := svc.ListReferrals(t.Context(), user, opts)
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

		mockRepo.On("ListReferrals", t.Context(), &model.User{ID: userID}, model.ListReferralsOptions{}).Return(nil, expectedErr).Once()

		svc := NewReferralService(Config{
			Repository: mockRepo,
		})

		_, err := svc.ListReferrals(t.Context(), &model.User{ID: userID}, model.ListReferralsOptions{})
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
		mockRepo.On("CreateReferral", t.Context(), user, req).Return(expectedReferral, nil).Once()

		svc := NewReferralService(Config{
			Repository: mockRepo,
		})

		referral, err := svc.CreateReferral(t.Context(), user, req)
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

		mockRepo.On("CreateReferral", t.Context(), &model.User{ID: userID}, model.CreateReferralRequest{}).Return(nil, expectedErr).Once()

		svc := NewReferralService(Config{
			Repository: mockRepo,
		})

		_, err := svc.CreateReferral(t.Context(), &model.User{ID: userID}, model.CreateReferralRequest{})
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
		mockRepo.On("UpdateReferral", t.Context(), referralID, user, req).Return(expectedReferral, nil).Once()

		svc := NewReferralService(Config{
			Repository: mockRepo,
		})

		referral, err := svc.UpdateReferral(t.Context(), referralID, user, req)
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
		mockRepo.On("DeleteReferral", t.Context(), referralID, user).Return(nil).Once()

		svc := NewReferralService(Config{
			Repository: mockRepo,
		})

		err := svc.DeleteReferral(t.Context(), referralID, user)
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

		mockRepo.On("DeleteReferral", t.Context(), referralID, &model.User{ID: userID}).Return(expectedErr).Once()

		svc := NewReferralService(Config{
			Repository: mockRepo,
		})

		err := svc.DeleteReferral(t.Context(), referralID, &model.User{ID: userID})
		if !errors.Is(err, expectedErr) {
			t.Errorf("expected error %v, got %v", expectedErr, err)
		}

		mockRepo.AssertExpectations(t)
	})
}
