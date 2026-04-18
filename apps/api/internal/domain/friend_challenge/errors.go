package friend_challenge

import "errors"

// Domain errors. The API layer maps these to kratos codes.
var (
	ErrOpponentNotFound       = errors.New("friend_challenge: opponent not found")
	ErrCannotChallengeSelf    = errors.New("friend_challenge: cannot challenge yourself")
	ErrTaskTitleMissing       = errors.New("friend_challenge: task_title is required")
	ErrNoteTooLong            = errors.New("friend_challenge: note exceeds 400 chars")
	ErrChallengeNotFound      = errors.New("friend_challenge: challenge not found")
	ErrNotParticipant         = errors.New("friend_challenge: user is not a participant")
	ErrAlreadyCompleted       = errors.New("friend_challenge: challenge already completed")
	ErrAlreadyExpired         = errors.New("friend_challenge: challenge expired")
	ErrAlreadyDeclined        = errors.New("friend_challenge: challenge was declined")
	ErrAlreadySubmitted       = errors.New("friend_challenge: already submitted")
	ErrBadScore               = errors.New("friend_challenge: score must be 0..5")
	ErrBadTime                = errors.New("friend_challenge: time_ms must be positive")
	ErrOnlyOpponentCanDecline = errors.New("friend_challenge: only the opponent can decline")
)
