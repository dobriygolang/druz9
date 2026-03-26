package geo

import "github.com/go-kratos/kratos/v2/errors"

var (
	ErrInvalidQuery = errors.BadRequest("INVALID_QUERY", "invalid query")
	ErrResolve      = errors.InternalServer("RESOLVE_FAILED", "failed to resolve geo")
	ErrNoCandidates = errors.NotFound("NO_CANDIDATES", "no geo candidates found")
)
