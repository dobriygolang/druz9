package social

import "errors"

var (
	ErrUserNotFound     = errors.New("social: user not found")
	ErrCannotFriendSelf = errors.New("social: cannot friend yourself")
	ErrAlreadyFriends   = errors.New("social: already friends")
	ErrRequestPending   = errors.New("social: a friend request is already pending")
	ErrRequestNotFound  = errors.New("social: friend request not found")
	ErrNotRecipient     = errors.New("social: only the recipient can accept/decline")
	ErrAlreadyResolved  = errors.New("social: request has already been resolved")
	ErrMessageTooLong   = errors.New("social: message exceeds 280 chars")
	ErrNotFriends       = errors.New("social: not friends")
)
