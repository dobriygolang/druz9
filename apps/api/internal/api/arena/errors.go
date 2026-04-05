package arena

import (
	arenadomain "api/internal/domain/arena"

	"github.com/go-kratos/kratos/v2/errors"
)

func mapErr(err error) error {
	switch {
	case errors.Is(err, arenadomain.ErrMatchNotFound):
		return errors.NotFound("MATCH_NOT_FOUND", "arena match not found")
	case errors.Is(err, arenadomain.ErrMatchFull):
		return errors.BadRequest("MATCH_FULL", "arena match is full")
	case errors.Is(err, arenadomain.ErrMatchNotActive):
		return errors.BadRequest("MATCH_NOT_ACTIVE", "arena match is not active")
	case errors.Is(err, arenadomain.ErrTaskNotFound):
		return errors.NotFound("ARENA_TASK_NOT_FOUND", "arena task not found")
	case errors.Is(err, arenadomain.ErrNoAvailableTasks):
		return errors.BadRequest("NO_AVAILABLE_TASKS", "no available arena tasks for this filter")
	case errors.Is(err, arenadomain.ErrPlayerFrozen):
		return errors.BadRequest("PLAYER_FROZEN", "editing is frozen after previous failed submission")
	case errors.Is(err, arenadomain.ErrPlayerNotInMatch):
		return errors.Forbidden("PLAYER_NOT_IN_MATCH", "player is not in this match")
	case errors.Is(err, arenadomain.ErrGuestsNotSupported):
		return errors.Forbidden("ARENA_REQUIRES_AUTH", "arena is available only for registered users")
	default:
		return errors.InternalServer("INTERNAL_ERROR", err.Error())
	}
}
