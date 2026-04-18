// Package apihelpers holds shared utilities for the transport (api) layer.
// Before extraction, every handler hand-rolled the same patterns:
//
//   - "get authenticated user from ctx, 401 if missing"
//   - "parse a UUID path/body field, 400 with INVALID_X code if bad"
//   - "clamp limit/offset to page defaults"
//
// These live here so changing error message format or auth contract only
// touches one place. The package has NO dependency on domain/data — it
// speaks raw kratos errors and uuid — so any transport handler can import
// it without pulling a cycle.
package apihelpers

import (
	"context"

	"api/internal/model"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

// RequireUser returns the authenticated user or a 401 kratos error.
// Callers just `user, err := apihelpers.RequireUser(ctx)` instead of
// the 3-line boilerplate they used to write.
func RequireUser(ctx context.Context) (*model.User, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok || user == nil {
		return nil, errors.Unauthorized("UNAUTHORIZED", "authentication required")
	}
	return user, nil
}

// OptionalUser returns the authenticated user (or nil) — used by endpoints
// that allow both guests and signed-in callers (e.g. public profile view).
func OptionalUser(ctx context.Context) *model.User {
	user, _ := model.UserFromContext(ctx)
	return user
}

// ParseUUID turns a request field into a uuid, returning a 400 kratos
// error with a caller-provided code. The `fieldLabel` flows into the
// message so clients see "invalid guild_id" not a generic "invalid id".
//
// Empty input is treated specially: a blank string coming off the wire
// almost always means "client forgot to send the value" (e.g. fired a
// request before useAuth() resolved) rather than "malformed UUID", so
// we surface 401 Unauthorized instead of 400. Clients react by
// redirecting to /login rather than showing a red error toast.
func ParseUUID(raw, errCode, fieldLabel string) (uuid.UUID, error) {
	if raw == "" {
		return uuid.Nil, errors.Unauthorized("UNAUTHORIZED", "missing "+fieldLabel)
	}
	id, err := uuid.Parse(raw)
	if err != nil {
		return uuid.Nil, errors.BadRequest(errCode, "invalid "+fieldLabel)
	}
	return id, nil
}

// ParseOptionalUUID returns (uuid.Nil, nil) for empty input instead of
// 400. Useful when a field is optional (e.g. guild_id filter).
func ParseOptionalUUID(raw, errCode, fieldLabel string) (uuid.UUID, error) {
	if raw == "" {
		return uuid.Nil, nil
	}
	return ParseUUID(raw, errCode, fieldLabel)
}
