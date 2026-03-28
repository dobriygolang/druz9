package codeeditor

import "errors"

var (
	ErrRoomNotFound      = errors.New("room not found")
	ErrRoomFull          = errors.New("room is full")
	ErrInvalidMode       = errors.New("invalid room mode")
	ErrTaskNotFound      = errors.New("task not found")
	ErrNoAvailableTasks  = errors.New("no available tasks")
	ErrRoomAlreadyClosed = errors.New("room already finished")
)
