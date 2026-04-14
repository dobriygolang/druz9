package realtime

import "github.com/google/uuid"

func mustParseUUID(raw string) uuid.UUID {
	parsed, err := uuid.Parse(raw)
	if err != nil {
		return uuid.Nil
	}
	return parsed
}

func parseOptionalUUID(raw string) *uuid.UUID {
	parsed, err := uuid.Parse(raw)
	if err != nil {
		return nil
	}
	return &parsed
}
