package friend_challenge

import (
	"context"

	"api/internal/model"

	"github.com/google/uuid"
)

// ListIncoming returns challenges where the user is the opponent and still
// needs to act (PENDING or IN_PROGRESS). Completed/declined/expired land in
// ListHistory.
func (s *Service) ListIncoming(ctx context.Context, userID uuid.UUID, limit, offset int32) (*model.ChallengeList, error) {
	limit, offset = clampPaging(limit, offset)
	items, total, err := s.repo.ListIncoming(ctx, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	return &model.ChallengeList{Challenges: items, Total: total}, nil
}

// ListSent returns challenges the user created that aren't terminal.
func (s *Service) ListSent(ctx context.Context, userID uuid.UUID, limit, offset int32) (*model.ChallengeList, error) {
	limit, offset = clampPaging(limit, offset)
	items, total, err := s.repo.ListSent(ctx, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	return &model.ChallengeList{Challenges: items, Total: total}, nil
}

// ListHistory returns terminal challenges (completed, expired, declined)
// where the user was a participant on either side.
func (s *Service) ListHistory(ctx context.Context, userID uuid.UUID, limit, offset int32) (*model.ChallengeList, error) {
	limit, offset = clampPaging(limit, offset)
	items, total, err := s.repo.ListHistory(ctx, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	return &model.ChallengeList{Challenges: items, Total: total}, nil
}

// SweepExpired is called by a background worker (or the request path, lazily)
// to mark rows whose deadline has passed. Returns count updated.
func (s *Service) SweepExpired(ctx context.Context) (int, error) {
	return s.repo.SweepExpired(ctx, s.clock.Now())
}

func clampPaging(limit, offset int32) (int32, int32) {
	if limit <= 0 {
		limit = 50
	}
	if limit > 200 {
		limit = 200
	}
	if offset < 0 {
		offset = 0
	}
	return limit, offset
}
