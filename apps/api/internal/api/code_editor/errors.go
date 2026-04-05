package code_editor

import (
	codeeditordomain "api/internal/domain/codeeditor"

	"github.com/go-kratos/kratos/v2/errors"
)

func mapErr(err error) error {
	switch {
	case errors.Is(err, codeeditordomain.ErrRoomNotFound):
		return errors.NotFound("ROOM_NOT_FOUND", "room not found")
	case errors.Is(err, codeeditordomain.ErrRoomFull):
		return errors.BadRequest("ROOM_FULL", "room is full")
	case errors.Is(err, codeeditordomain.ErrRoomAlreadyClosed):
		return errors.BadRequest("ROOM_ALREADY_FINISHED", "room is already finished")
	case errors.Is(err, codeeditordomain.ErrInvalidMode):
		return errors.BadRequest("INVALID_MODE", "invalid room mode")
	case errors.Is(err, codeeditordomain.ErrTaskNotFound):
		return errors.NotFound("TASK_NOT_FOUND", "task not found")
	case errors.Is(err, codeeditordomain.ErrNoAvailableTasks):
		return errors.BadRequest("NO_AVAILABLE_TASKS", "no available tasks for this duel topic")
	default:
		return errors.InternalServer("INTERNAL_ERROR", err.Error())
	}
}
