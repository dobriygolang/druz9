// Package friend_challenge holds async-duel business logic: creating
// challenges, recording submissions, auto-resolving winners, expiring stale
// rows. The package has no proto or DB imports beyond the Repository
// interface.
package friend_challenge

import (
	"context"
	"time"

	"github.com/google/uuid"

	"api/internal/model"
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
