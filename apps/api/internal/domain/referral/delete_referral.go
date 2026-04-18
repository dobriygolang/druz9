package referral

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"api/internal/model"
)

// DeleteReferral deletes a referral.
func (s *Service) DeleteReferral(ctx context.Context, referralID uuid.UUID, user *model.User) error {
	if err := s.repo.DeleteReferral(ctx, referralID, user); err != nil {
		return fmt.Errorf("failed to delete referral: %w", err)
	}
	return nil
}
