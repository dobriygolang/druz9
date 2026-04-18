package referral

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"api/internal/model"
)

// UpdateReferral updates an existing referral.
func (s *Service) UpdateReferral(ctx context.Context, referralID uuid.UUID, user *model.User, req model.UpdateReferralRequest) (*model.Referral, error) {
	resp, err := s.repo.UpdateReferral(ctx, referralID, user, req)
	if err != nil {
		return nil, fmt.Errorf("failed to update referral: %w", err)
	}
	return resp, nil
}
