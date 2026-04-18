package geo

import (
	"context"
	stdErrors "errors"
	"fmt"

	"github.com/go-kratos/kratos/v2/errors"

	geoerrors "api/internal/errors/geo"
	v1 "api/pkg/api/geo/v1"
)

func (i *Implementation) Resolve(ctx context.Context, req *v1.ResolveRequest) (*v1.ResolveResponse, error) {
	resp, err := i.service.Resolve(ctx, req.GetQuery())
	if err != nil {
		switch {
		case stdErrors.Is(err, geoerrors.ErrInvalidQuery):
			return nil, errors.BadRequest("INVALID_QUERY", "invalid query")
		case stdErrors.Is(err, geoerrors.ErrNoCandidates):
			return nil, errors.NotFound("NO_CANDIDATES", "no geo candidates found")
		default:
			return nil, fmt.Errorf("resolve: %w", err)
		}
	}

	return mapResolveResponse(resp), nil
}
