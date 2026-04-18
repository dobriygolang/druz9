package referral

import (
	"context"
	"fmt"

	"api/internal/model"
)

// CreateReferral creates a new referral.
func (s *Service) CreateReferral(ctx context.Context, user *model.User, req model.CreateReferralRequest) (*model.Referral, error) {
	resp, err := s.repo.CreateReferral(ctx, user, req)
	if err != nil {
		return nil, fmt.Errorf("failed to create referral: %w", err)
	}
	return resp, nil
}
