package referral

import (
	"context"

	"api/internal/model"
)

// CreateReferral creates a new referral.
func (s *Service) CreateReferral(ctx context.Context, user *model.User, req model.CreateReferralRequest) (*model.Referral, error) {
	return s.repo.CreateReferral(ctx, user, req)
}
