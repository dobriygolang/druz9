package referral

import (
	"context"

	"github.com/google/uuid"

	"api/internal/model"
)

// DeleteReferral deletes a referral.
func (s *Service) DeleteReferral(ctx context.Context, referralID uuid.UUID, user *model.User) error {
	return s.repo.DeleteReferral(ctx, referralID, user)
}
