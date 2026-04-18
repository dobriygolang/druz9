package friend_challenge

import (
	"context"

	"github.com/google/uuid"

	"api/internal/model"
)

// Decline is only callable by the opponent while the challenge is PENDING
// (they haven't started yet) or IN_PROGRESS (they did, but want out).
func (s *Service) Decline(ctx context.Context, userID, challengeID uuid.UUID) (*model.FriendChallenge, error) {
	ch, err := s.repo.GetByID(ctx, challengeID)
	if err != nil {
		return nil, err
	}
	if ch == nil {
		return nil, ErrChallengeNotFound
	}
	if ch.OpponentID != userID {
		return nil, ErrOnlyOpponentCanDecline
	}
	switch ch.Status {
	case model.ChallengeStatusUnspecified, model.ChallengeStatusPending, model.ChallengeStatusInProgress:
		// Decline is allowed for pending and in-progress challenges.
	case model.ChallengeStatusCompleted:
		return nil, ErrAlreadyCompleted
	case model.ChallengeStatusExpired:
		return nil, ErrAlreadyExpired
	case model.ChallengeStatusDeclined:
		return nil, ErrAlreadyDeclined
	}
	ch.Status = model.ChallengeStatusDeclined
	now := s.clock.Now()
	ch.CompletedAt = &now
	// Challenger wins by forfeit.
	winner := ch.ChallengerID
	ch.WinnerID = &winner
	if err := s.repo.Update(ctx, ch); err != nil {
		return nil, err
	}
	return ch, nil
}
