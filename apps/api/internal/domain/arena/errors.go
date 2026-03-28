package arena

import "errors"

var (
	ErrMatchNotFound      = errors.New("arena match not found")
	ErrMatchFull          = errors.New("arena match is full")
	ErrMatchNotActive     = errors.New("arena match is not active")
	ErrTaskNotFound       = errors.New("arena task not found")
	ErrNoAvailableTasks   = errors.New("no available arena tasks")
	ErrPlayerFrozen       = errors.New("arena player is frozen")
	ErrPlayerNotInMatch   = errors.New("arena player not in match")
	ErrGuestsNotSupported = errors.New("arena is available only for registered users")
)
