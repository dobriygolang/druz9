package service

import (
	"context"

	"api/internal/model"

	"github.com/google/uuid"
)

// DeleteReferral deletes a referral.
func (s *Service) DeleteReferral(ctx context.Context, referralID uuid.UUID, user *model.User) error {
	return s.repo.DeleteReferral(ctx, referralID, user)
}
