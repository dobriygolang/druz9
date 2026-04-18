package friend_challenge

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	profiledata "api/internal/data/profile"
	friendchallengedomain "api/internal/domain/friend_challenge"
)

// UserLookupAdapter implements the friend_challenge.UserLookup interface using
// the profile repo as its data source. Lives here (not in the domain package)
// because it crosses a module boundary (profile repo).
type UserLookupAdapter struct {
	profileRepo *profiledata.Repo
}

// NewUserLookupAdapter constructs a UserLookupAdapter.
func NewUserLookupAdapter(profileRepo *profiledata.Repo) *UserLookupAdapter {
	return &UserLookupAdapter{profileRepo: profileRepo}
}

// Ensure interface satisfaction at compile time.
var _ friendchallengedomain.UserLookup = (*UserLookupAdapter)(nil)

// FindUserIDByUsername resolves a username to (id, canonical username).
func (a *UserLookupAdapter) FindUserIDByUsername(ctx context.Context, username string) (uuid.UUID, string, error) {
	user, err := a.profileRepo.FindUserByUsername(ctx, username)
	if err != nil {
		return uuid.Nil, "", fmt.Errorf("lookup by username: %w", err)
	}
	if user == nil {
		return uuid.Nil, "", friendchallengedomain.ErrOpponentNotFound
	}
	return user.ID, user.Username, nil
}

// FindUsernameByID resolves a user id to username.
func (a *UserLookupAdapter) FindUsernameByID(ctx context.Context, userID uuid.UUID) (string, error) {
	user, err := a.profileRepo.FindUserByID(ctx, userID)
	if err != nil {
		return "", fmt.Errorf("lookup by id: %w", err)
	}
	if user == nil {
		return "", nil
	}
	return user.Username, nil
}
