package referral

import (
	"context"
	"fmt"

	"api/internal/model"
)

// ListReferrals retrieves referrals with pagination.
func (s *Service) ListReferrals(ctx context.Context, user *model.User, opts model.ListReferralsOptions) (*model.ListReferralsResponse, error) {
	resp, err := s.repo.ListReferrals(ctx, user, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to list referrals: %w", err)
	}
	return resp, nil
}
