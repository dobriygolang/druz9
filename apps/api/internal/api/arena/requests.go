package arena

import (
	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

func parseArenaMatchID(raw string) (uuid.UUID, error) {
	matchID, err := uuid.Parse(raw)
	if err != nil {
		return uuid.Nil, errors.BadRequest("INVALID_MATCH_ID", "invalid match id")
	}
	return matchID, nil
}
