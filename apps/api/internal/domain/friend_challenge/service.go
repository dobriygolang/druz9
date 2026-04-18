// Package friend_challenge holds async-duel business logic: creating
// challenges, recording submissions, auto-resolving winners, expiring stale
// rows. The package has no proto or DB imports beyond the Repository
// interface.
package friend_challenge

import (
	"context"
	"errors"
	"strings"
	"time"

	"api/internal/model"

	"github.com/google/uuid"
)

const (
	// DefaultDeadline is the window in which both players must submit.
	DefaultDeadline = 48 * time.Hour
	// MaxNoteLen caps the optional "bet you can't beat my time" message.
	MaxNoteLen = 400
)

//go:generate mockery --case underscore --name Repository --with-expecter --output mocks

// Repository is the persistence boundary for friend challenges.
type Repository interface {
	Insert(ctx context.Context, ch *model.FriendChallenge) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.FriendChallenge, error)
	Update(ctx context.Context, ch *model.FriendChallenge) error
	ListIncoming(ctx context.Context, userID uuid.UUID, limit, offset int32) ([]*model.FriendChallenge, int32, error)
	ListSent(ctx context.Context, userID uuid.UUID, limit, offset int32) ([]*model.FriendChallenge, int32, error)
	ListHistory(ctx context.Context, userID uuid.UUID, limit, offset int32) ([]*model.FriendChallenge, int32, error)
	SweepExpired(ctx context.Context, now time.Time) (int, error)
}

//go:generate mockery --case underscore --name UserLookup --with-expecter --output mocks

// UserLookup resolves usernames to user IDs when sending a challenge. It's a
// separate dependency so the domain service doesn't need the full profile
// repo surface.
type UserLookup interface {
	FindUserIDByUsername(ctx context.Context, username string) (uuid.UUID, string, error)
	FindUsernameByID(ctx context.Context, userID uuid.UUID) (string, error)
}

// Clock is trivially mockable in tests to control "now". Production uses
// time.Now.
type Clock interface {
	Now() time.Time
}
type systemClock struct{}

func (systemClock) Now() time.Time { return time.Now().UTC() }

// Config bundles domain dependencies.
type Config struct {
	Repository Repository
	Users      UserLookup
	Clock      Clock // optional; defaults to systemClock
}

// Service exposes friend-challenge domain operations.
type Service struct {
	repo  Repository
	users UserLookup
	clock Clock
}

// NewService constructs the domain service.
func NewService(c Config) *Service {
	clock := c.Clock
	if clock == nil {
		clock = systemClock{}
	}
	return &Service{repo: c.Repository, users: c.Users, clock: clock}
}

// Domain errors. The API layer maps these to kratos codes.
var (
	ErrOpponentNotFound   = errors.New("friend_challenge: opponent not found")
	ErrCannotChallengeSelf = errors.New("friend_challenge: cannot challenge yourself")
	ErrTaskTitleMissing   = errors.New("friend_challenge: task_title is required")
	ErrNoteTooLong        = errors.New("friend_challenge: note exceeds 400 chars")
	ErrChallengeNotFound  = errors.New("friend_challenge: challenge not found")
	ErrNotParticipant     = errors.New("friend_challenge: user is not a participant")
	ErrAlreadyCompleted   = errors.New("friend_challenge: challenge already completed")
	ErrAlreadyExpired     = errors.New("friend_challenge: challenge expired")
	ErrAlreadyDeclined    = errors.New("friend_challenge: challenge was declined")
	ErrAlreadySubmitted   = errors.New("friend_challenge: already submitted")
	ErrBadScore           = errors.New("friend_challenge: score must be 0..5")
	ErrBadTime            = errors.New("friend_challenge: time_ms must be positive")
	ErrOnlyOpponentCanDecline = errors.New("friend_challenge: only the opponent can decline")
)

// SendChallenge creates a new row after validating the inputs and resolving
// the opponent's username to a user id.
func (s *Service) SendChallenge(
	ctx context.Context,
	challengerID uuid.UUID,
	opponentUsername, taskTitle, taskTopic, taskRef, note string,
	difficulty model.ChallengeDifficulty,
) (*model.FriendChallenge, error) {
	taskTitle = strings.TrimSpace(taskTitle)
	if taskTitle == "" {
		return nil, ErrTaskTitleMissing
	}
	if len(note) > MaxNoteLen {
		return nil, ErrNoteTooLong
	}

	opponentID, opponentName, err := s.users.FindUserIDByUsername(ctx, opponentUsername)
	if err != nil {
		return nil, ErrOpponentNotFound
	}
	if opponentID == challengerID {
		return nil, ErrCannotChallengeSelf
	}

	challengerName, err := s.users.FindUsernameByID(ctx, challengerID)
	if err != nil {
		challengerName = "" // best-effort; row still inserts
	}

	now := s.clock.Now()
	ch := &model.FriendChallenge{
		ID:                 uuid.New(),
		ChallengerID:       challengerID,
		ChallengerUsername: challengerName,
		OpponentID:         opponentID,
		OpponentUsername:   opponentName,
		TaskTitle:          taskTitle,
		TaskTopic:          strings.TrimSpace(taskTopic),
		TaskDifficulty:     difficulty,
		TaskRef:            strings.TrimSpace(taskRef),
		Note:               strings.TrimSpace(note),
		Status:             model.ChallengeStatusPending,
		DeadlineAt:         now.Add(DefaultDeadline),
		CreatedAt:          now,
	}
	if err := s.repo.Insert(ctx, ch); err != nil {
		return nil, err
	}
	return ch, nil
}

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

func ptrInt32(v int32) *int32 { return &v }
