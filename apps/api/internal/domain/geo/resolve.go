package geo

import (
	"context"
	"fmt"
	"strings"

	geoerrors "api/internal/errors/geo"
	"api/internal/model"
)

// Resolve implements internal/api/geo service interface.
func (s *Service) Resolve(
	ctx context.Context,
	query string,
) (*model.GeoResolveResponse, error) {
	if s.resolver == nil {
		return nil, geoerrors.ErrResolve
	}

	normalized := normalizeQuery(query)
	if normalized == "" {
		return nil, geoerrors.ErrInvalidQuery
	}

	candidates, err := s.resolver.Resolve(ctx, normalized, 5)
	if err != nil {
		return nil, fmt.Errorf("resolve: %w", err)
	}
	if len(candidates) == 0 {
		return nil, geoerrors.ErrNoCandidates
	}

	return &model.GeoResolveResponse{Candidates: candidates}, nil
}

func normalizeQuery(query string) string {
	query = strings.TrimSpace(query)
	if query == "" {
		return ""
	}

	query = strings.ReplaceAll(query, "ё", "е")
	query = strings.ReplaceAll(query, "Ё", "Е")
	query = strings.Join(strings.Fields(query), " ")
	query = strings.Trim(query, ", ")
	return query
}
