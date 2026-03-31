package arena

import (
	"context"
	"encoding/base64"
	"strings"

	"api/internal/model"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/go-kratos/kratos/v2/transport"
	kratoshttp "github.com/go-kratos/kratos/v2/transport/http"
	"github.com/google/uuid"
)

const (
	arenaGuestIDHeader   = "X-Arena-Guest-Id"
	arenaGuestNameHeader = "X-Arena-Guest-Name"
)

func resolveArenaActor(ctx context.Context, requireIdentity bool) (*model.User, error) {
	user, ok := model.UserFromContext(ctx)
	if ok && user != nil {
		return user, nil
	}

	guestID, guestName := arenaGuestHeaders(ctx)
	if guestID == "" {
		if requireIdentity {
			return nil, errors.Unauthorized("UNAUTHORIZED", "authentication required")
		}
		return nil, nil
	}

	parsedID, err := uuid.Parse(guestID)
	if err != nil {
		return nil, errors.BadRequest("INVALID_GUEST_ID", "invalid arena guest id")
	}
	if guestName == "" {
		guestName = "Guest"
	}

	return &model.User{
		ID:        parsedID,
		FirstName: guestName,
		Status:    model.UserStatusGuest,
	}, nil
}

func arenaGuestHeaders(ctx context.Context) (string, string) {
	tr, ok := transport.FromServerContext(ctx)
	if !ok {
		return "", ""
	}
	httpTransport, ok := tr.(*kratoshttp.Transport)
	if !ok || httpTransport.Request() == nil {
		return "", ""
	}

	guestID := strings.TrimSpace(httpTransport.Request().Header.Get(arenaGuestIDHeader))
	encodedName := strings.TrimSpace(httpTransport.Request().Header.Get(arenaGuestNameHeader))

	// Decode Base64 to support Unicode characters
	guestName := encodedName
	if encodedName != "" {
		decoded, err := base64.StdEncoding.DecodeString(encodedName)
		if err == nil {
			guestName = string(decoded)
		}
		// If decoding fails, use raw value (backward compatibility)
	}

	return guestID, guestName
}

func parseArenaMatchID(raw string) (uuid.UUID, error) {
	matchID, err := uuid.Parse(raw)
	if err != nil {
		return uuid.Nil, errors.BadRequest("INVALID_MATCH_ID", "invalid match id")
	}
	return matchID, nil
}
