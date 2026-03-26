package service

import (
	"context"

	"api/internal/model"

	"github.com/google/uuid"
)

// UpdateReferral updates an existing referral.
func (s *Service) UpdateReferral(ctx context.Context, referralID uuid.UUID, user *model.User, req model.UpdateReferralRequest) (*model.Referral, error) {
	return s.repo.UpdateReferral(ctx, referralID, user, req)
}
