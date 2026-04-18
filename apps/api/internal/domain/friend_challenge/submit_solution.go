package friend_challenge

import (
	"context"

	"api/internal/model"

	"github.com/google/uuid"
)

// SubmitSolution records a participant's time + score. If the counterparty
// has already submitted, the row transitions to COMPLETED and a winner is
// picked. Otherwise it moves from PENDING → IN_PROGRESS.
func (s *Service) SubmitSolution(
	ctx context.Context,
	userID uuid.UUID,
	challengeID uuid.UUID,
	timeMs, score int32,
) (*model.FriendChallenge, error) {
	if timeMs <= 0 {
		return nil, ErrBadTime
	}
	if score < 0 || score > 5 {
		return nil, ErrBadScore
	}

	ch, err := s.repo.GetByID(ctx, challengeID)
	if err != nil {
		return nil, err
	}
	if ch == nil {
		return nil, ErrChallengeNotFound
	}
	if ch.ChallengerID != userID && ch.OpponentID != userID {
		return nil, ErrNotParticipant
	}
	switch ch.Status {
	case model.ChallengeStatusCompleted:
		return nil, ErrAlreadyCompleted
	case model.ChallengeStatusExpired:
		return nil, ErrAlreadyExpired
	case model.ChallengeStatusDeclined:
		return nil, ErrAlreadyDeclined
	}

	now := s.clock.Now()
	if now.After(ch.DeadlineAt) {
		ch.Status = model.ChallengeStatusExpired
		if err := s.repo.Update(ctx, ch); err != nil {
			return nil, err
		}
		return nil, ErrAlreadyExpired
	}

	isChallenger := ch.ChallengerID == userID
	if isChallenger {
		if ch.ChallengerSubmittedAt != nil {
			return nil, ErrAlreadySubmitted
		}
		t := now
		ch.ChallengerSubmittedAt = &t
		ch.ChallengerTimeMs = ptrInt32(timeMs)
		ch.ChallengerScore = ptrInt32(score)
	} else {
		if ch.OpponentSubmittedAt != nil {
			return nil, ErrAlreadySubmitted
		}
		t := now
		ch.OpponentSubmittedAt = &t
		ch.OpponentTimeMs = ptrInt32(timeMs)
		ch.OpponentScore = ptrInt32(score)
	}

	// Status transition.
	bothSubmitted := ch.ChallengerSubmittedAt != nil && ch.OpponentSubmittedAt != nil
	if bothSubmitted {
		ch.Status = model.ChallengeStatusCompleted
		t := now
		ch.CompletedAt = &t
		winner := resolveWinner(ch)
		if winner != uuid.Nil {
			ch.WinnerID = &winner
		}
	} else {
		ch.Status = model.ChallengeStatusInProgress
	}

	if err := s.repo.Update(ctx, ch); err != nil {
		return nil, err
	}
	return ch, nil
}

// resolveWinner picks the winner between two submitted solutions. Higher
// score wins; on ties, shorter time wins. Equal on both → draw (returns
// Nil UUID so the column stays NULL).
func resolveWinner(ch *model.FriendChallenge) uuid.UUID {
	if ch.ChallengerScore == nil || ch.OpponentScore == nil {
		return uuid.Nil
	}
	if *ch.ChallengerScore != *ch.OpponentScore {
		if *ch.ChallengerScore > *ch.OpponentScore {
			return ch.ChallengerID
		}
		return ch.OpponentID
	}
	if ch.ChallengerTimeMs != nil && ch.OpponentTimeMs != nil {
		if *ch.ChallengerTimeMs < *ch.OpponentTimeMs {
			return ch.ChallengerID
		}
		if *ch.ChallengerTimeMs > *ch.OpponentTimeMs {
			return ch.OpponentID
		}
	}
	return uuid.Nil // perfect tie → no winner recorded
}
